import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { VoiceUserState } from '../types';

interface Props {
  roomCode: string;
  currentUserUid: string;
  currentUserName: string;
  onToast?: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
  permissionErrorMsg?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function useVoiceChat({
  roomCode,
  currentUserUid,
  currentUserName,
  onToast,
  permissionErrorMsg = 'Could not access microphone'
}: Props) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<Record<string, VoiceUserState>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const lastSpeakingUpdateRef = useRef<number>(0);

  // Sync voiceStates from Firebase
  useEffect(() => {
    if (!roomCode) return;
    const voiceRef = db.ref(`spy_rooms/${roomCode}/voiceStates`);
    const onVoiceData = (snap: firebase.database.DataSnapshot) => {
      const data = (snap.val() || {}) as Record<string, VoiceUserState>;
      setVoiceUsers(data);
    };
    voiceRef.on('value', onVoiceData);

    return () => {
      voiceRef.off('value', onVoiceData);
    };
  }, [roomCode]);

  // Audio level monitoring for local microphone
  const startVolumeDetection = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current || !localStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const nowSpeaking = avg > 18;

        setIsSpeaking(prev => {
          if (prev !== nowSpeaking) {
            const now = Date.now();
            if (now - lastSpeakingUpdateRef.current > 300) {
              lastSpeakingUpdateRef.current = now;
              db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}/speaking`).set(nowSpeaking).catch(() => {});
            }
            return nowSpeaking;
          }
          return prev;
        });

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Volume detection not supported:', e);
    }
  };

  const stopVolumeDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
  };

  // WebRTC Peer signaling listener
  useEffect(() => {
    if (!isJoined || !roomCode || !currentUserUid) return;

    const signalingRef = db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}`);

    const onIncomingSignal = async (snap: firebase.database.DataSnapshot) => {
      const signals = snap.val() || {};

      for (const peerUid in signals) {
        const signalData = signals[peerUid];
        if (!signalData) continue;

        let pc = peerConnectionsRef.current[peerUid];
        if (!pc && localStreamRef.current) {
          pc = createPeerConnection(peerUid);
        }
        if (!pc) continue;

        // Process Offer
        if (signalData.offer && pc.signalingState !== 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await db.ref(`spy_rooms/${roomCode}/voiceSignaling/${peerUid}/${currentUserUid}/answer`).set({
              type: answer.type,
              sdp: answer.sdp
            });
            // Clear processed offer
            db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}/${peerUid}/offer`).remove();
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        }

        // Process Answer
        if (signalData.answer && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
            db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}/${peerUid}/answer`).remove();
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }

        // Process Candidates
        if (signalData.candidates) {
          for (const candKey in signalData.candidates) {
            const cand = signalData.candidates[candKey];
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                // ignore late candidate
              }
            }
          }
          db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}/${peerUid}/candidates`).remove();
        }
      }
    };

    signalingRef.on('value', onIncomingSignal);

    return () => {
      signalingRef.off('value', onIncomingSignal);
    };
  }, [isJoined, roomCode, currentUserUid]);

  // Create WebRTC Peer Connection helper
  const createPeerConnection = useCallback((peerUid: string): RTCPeerConnection => {
    if (peerConnectionsRef.current[peerUid]) {
      return peerConnectionsRef.current[peerUid];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[peerUid] = pc;

    // Add local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        db.ref(`spy_rooms/${roomCode}/voiceSignaling/${peerUid}/${currentUserUid}/candidates`).push(
          event.candidate.toJSON()
        );
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      let audioEl = audioElementsRef.current[peerUid];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioElementsRef.current[peerUid] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (audioElementsRef.current[peerUid]) {
          audioElementsRef.current[peerUid].remove();
          delete audioElementsRef.current[peerUid];
        }
      }
    };

    return pc;
  }, [roomCode, currentUserUid]);

  // Connect to peers who are already active
  const connectToActivePeers = useCallback(async () => {
    const peers = Object.values(voiceUsers).filter(u => u.active && u.uid !== currentUserUid);

    for (const peer of peers) {
      // Deterministic polite offerer pattern: UID with smaller string creates offer
      if (currentUserUid < peer.uid) {
        const pc = createPeerConnection(peer.uid);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await db.ref(`spy_rooms/${roomCode}/voiceSignaling/${peer.uid}/${currentUserUid}/offer`).set({
            type: offer.type,
            sdp: offer.sdp
          });
        } catch (err) {
          console.error('Failed to create offer for peer:', peer.uid, err);
        }
      }
    }
  }, [voiceUsers, currentUserUid, roomCode, createPeerConnection]);

  useEffect(() => {
    if (isJoined) {
      connectToActivePeers();
    }
  }, [isJoined, voiceUsers, connectToActivePeers]);

  // Join Voice Chat
  const joinVoice = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onToast?.(permissionErrorMsg, 'danger');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      setIsJoined(true);
      setIsMuted(false);

      // Start volume detector
      startVolumeDetection(stream);

      // Publish presence in Firebase
      const myVoiceRef = db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}`);
      await myVoiceRef.set({
        uid: currentUserUid,
        name: currentUserName,
        muted: false,
        speaking: false,
        active: true,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });

      myVoiceRef.onDisconnect().remove();

      onToast?.('🎙️ تم تفعيل المحادثة الصوتية بنجاح!', 'success');
    } catch (err) {
      console.error('Voice join error:', err);
      onToast?.(permissionErrorMsg, 'danger');
    }
  };

  // Leave Voice Chat
  const leaveVoice = useCallback(async () => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    stopVolumeDetection();

    // Close peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    // Remove remote audio elements
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current = {};

    setIsJoined(false);
    setIsMuted(false);
    setIsSpeaking(false);

    // Clean up Firebase state
    try {
      await db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}`).remove();
      await db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}`).remove();
    } catch {
      // ignore
    }
  }, [roomCode, currentUserUid]);

  // Toggle Mute
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      const muted = !nextState;
      setIsMuted(muted);
      db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}/muted`).set(muted).catch(() => {});
      if (muted) {
        db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}/speaking`).set(false).catch(() => {});
      }
    }
  };

  // Clean up on unmount or room leave
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    isJoined,
    isMuted,
    isSpeaking,
    voiceUsers,
    joinVoice,
    leaveVoice,
    toggleMute
  };
}
