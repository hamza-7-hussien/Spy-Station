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
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<Record<string, VoiceUserState>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const isDeafenedRef = useRef<boolean>(false);
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
        // Check if local track is disabled/muted
        const isTrackMuted = !localStreamRef.current.getAudioTracks().some(t => t.enabled);
        const nowSpeaking = !isTrackMuted && avg > 18;

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
        audioEl.style.position = 'fixed';
        audioEl.style.pointerEvents = 'none';
        audioEl.style.opacity = '0';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        document.body.appendChild(audioEl);
        audioElementsRef.current[peerUid] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
      audioEl.muted = isDeafenedRef.current;
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
        const existingPc = peerConnectionsRef.current[peer.uid];
        // Do not create duplicate offers if connection is already established or negotiating
        if (
          existingPc &&
          (existingPc.connectionState === 'connected' ||
           existingPc.connectionState === 'connecting' ||
           existingPc.signalingState !== 'stable')
        ) {
          continue;
        }

        const pc = createPeerConnection(peer.uid);
        if (pc.signalingState !== 'stable') continue;

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

  // Join Voice Chat (startMuted defaults to true so headphones are on and mic is muted)
  const joinVoice = async (startMuted: boolean = true) => {
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

      // Mute microphone track if startMuted is requested
      stream.getAudioTracks().forEach(track => {
        track.enabled = !startMuted;
      });

      localStreamRef.current = stream;
      setIsJoined(true);
      setIsMuted(startMuted);
      setIsDeafened(false);
      isDeafenedRef.current = false;

      // Start volume detector
      startVolumeDetection(stream);

      // Publish presence in Firebase
      const myVoiceRef = db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}`);
      await myVoiceRef.set({
        uid: currentUserUid,
        name: currentUserName,
        muted: startMuted,
        deafened: false,
        speaking: false,
        active: true,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });

      myVoiceRef.onDisconnect().remove();
    } catch (err) {
      console.warn('Voice auto-join waiting for user interaction:', err);
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

  // Automatically connect to voice when entering a room with headphones active and mic muted
  useEffect(() => {
    if (roomCode && currentUserUid && !isJoined) {
      joinVoice(true);
      const onUserGesture = () => {
        if (!localStreamRef.current) {
          joinVoice(true);
        }
        window.removeEventListener('click', onUserGesture);
        window.removeEventListener('touchstart', onUserGesture);
      };
      window.addEventListener('click', onUserGesture, { once: true });
      window.addEventListener('touchstart', onUserGesture, { once: true });
      return () => {
        window.removeEventListener('click', onUserGesture);
        window.removeEventListener('touchstart', onUserGesture);
      };
    }
  }, [roomCode, currentUserUid]);

  // Toggle Mute (Microphone)
  const toggleMute = () => {
    if (!localStreamRef.current) {
      joinVoice(false);
      return;
    }
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

  // Toggle Deafen (Headphones / Audio Output)
  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafenedRef.current;
    isDeafenedRef.current = nextDeafened;
    setIsDeafened(nextDeafened);

    // Mute/unmute all incoming audio elements
    Object.values(audioElementsRef.current).forEach(audioEl => {
      audioEl.muted = nextDeafened;
    });

    if (roomCode && currentUserUid) {
      db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}/deafened`).set(nextDeafened).catch(() => {});
    }
  }, [roomCode, currentUserUid]);

  // Clean up on unmount or room leave
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    isJoined,
    isMuted,
    isDeafened,
    isSpeaking,
    voiceUsers,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen
  };
}
