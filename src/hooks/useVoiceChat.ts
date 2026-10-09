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
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

export function useVoiceChat({
  roomCode,
  currentUserUid,
  currentUserName,
  onToast,
  permissionErrorMsg = 'يرجى السماح بصلاحية الميكروفون لاستخدام المحادثة الصوتية 🎙️'
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
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const lastSpeakingUpdateRef = useRef<number>(0);

  // Resume all audio elements upon user click/tap to bypass browser autoplay restrictions
  useEffect(() => {
    const unlockAudios = () => {
      Object.values(audioElementsRef.current).forEach(el => {
        if (el && el.paused) {
          el.play().catch(() => {});
        }
      });
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudios, { passive: true });
    window.addEventListener('touchstart', unlockAudios, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudios);
      window.removeEventListener('touchstart', unlockAudios);
    };
  }, []);

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
        const isTrackMuted = !localStreamRef.current.getAudioTracks().some(t => t.enabled);
        const nowSpeaking = !isTrackMuted && avg > 14;

        setIsSpeaking(prev => {
          if (prev !== nowSpeaking) {
            const now = Date.now();
            if (now - lastSpeakingUpdateRef.current > 250) {
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

  // Helper to drain queued ICE candidates once remote description is set
  const drainCandidateQueue = async (peerUid: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current[peerUid];
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          // ignore late candidate
        }
      }
      pendingCandidatesRef.current[peerUid] = [];
    }
  };

  // Create WebRTC Peer Connection helper
  const createPeerConnection = useCallback((peerUid: string): RTCPeerConnection => {
    if (peerConnectionsRef.current[peerUid]) {
      return peerConnectionsRef.current[peerUid];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[peerUid] = pc;
    pendingCandidatesRef.current[peerUid] = [];

    // Always ensure an audio transceiver exists so incoming audio is negotiated properly
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (e) {
      console.warn('Failed to addTransceiver:', e);
    }

    // Attach local audio track if microphone stream is active
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track?.kind === 'audio' || !s.track);
        if (sender) {
          sender.replaceTrack(audioTrack).catch(() => {});
        } else {
          pc.addTrack(audioTrack, localStreamRef.current);
        }
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        db.ref(`spy_rooms/${roomCode}/voiceSignaling/${peerUid}/${currentUserUid}/candidates`).push(
          event.candidate.toJSON()
        );
      }
    };

    // Remote Track handler (plays audio from other players)
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      let audioEl = audioElementsRef.current[peerUid];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        (audioEl as unknown as { playsInline: boolean }).playsInline = true;
        audioEl.style.position = 'fixed';
        audioEl.style.pointerEvents = 'none';
        audioEl.style.opacity = '0';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        document.body.appendChild(audioEl);
        audioElementsRef.current[peerUid] = audioEl;
      }
      audioEl.srcObject = remoteStream;
      audioEl.muted = isDeafenedRef.current;
      audioEl.play().catch(e => {
        console.warn('Remote audio autoplay queued:', e);
      });
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
        if (!pc) {
          pc = createPeerConnection(peerUid);
        }

        // Process Offer
        if (signalData.offer && pc.signalingState !== 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
            await drainCandidateQueue(peerUid, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await db.ref(`spy_rooms/${roomCode}/voiceSignaling/${peerUid}/${currentUserUid}/answer`).set({
              type: answer.type,
              sdp: answer.sdp
            });
            db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}/${peerUid}/offer`).remove();
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        }

        // Process Answer
        if (signalData.answer && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
            await drainCandidateQueue(peerUid, pc);
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
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {
                  // ignore
                }
              } else {
                if (!pendingCandidatesRef.current[peerUid]) {
                  pendingCandidatesRef.current[peerUid] = [];
                }
                pendingCandidatesRef.current[peerUid].push(cand);
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
  }, [isJoined, roomCode, currentUserUid, createPeerConnection]);

  // Connect to peers who are already active
  const connectToActivePeers = useCallback(async () => {
    const peers = Object.values(voiceUsers).filter(u => u.active && u.uid !== currentUserUid);

    for (const peer of peers) {
      if (currentUserUid < peer.uid) {
        const existingPc = peerConnectionsRef.current[peer.uid];
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

  // Reliable media stream getter with mobile fallback
  const getSafeAudioStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
    } catch {
      // Fallback without constraints for strict webviews / devices
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
    }
  };

  // Join Voice Chat
  const joinVoice = async (startMuted: boolean = false) => {
    try {
      const stream = await getSafeAudioStream();

      // Set microphone track state based on startMuted
      stream.getAudioTracks().forEach(track => {
        track.enabled = !startMuted;
      });

      localStreamRef.current = stream;

      // Attach tracks to any already-created peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track?.kind === 'audio' || !s.track);
          if (sender) {
            sender.replaceTrack(audioTrack).catch(() => {});
          } else {
            try {
              pc.addTrack(audioTrack, stream);
            } catch {
              // ignore
            }
          }
        });
      }

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

      if (!startMuted) {
        onToast?.(
          permissionErrorMsg ? 'تم تشغيل المايك بنجاح 🎙️' : 'Microphone enabled 🎙️',
          'success'
        );
      }
    } catch (err) {
      console.warn('Voice join error:', err);
      onToast?.(permissionErrorMsg, 'danger');
    }
  };

  // Leave Voice Chat
  const leaveVoice = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    stopVolumeDetection();

    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    Object.values(audioElementsRef.current).forEach(audio => {
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current = {};

    setIsJoined(false);
    setIsMuted(false);
    setIsSpeaking(false);

    try {
      await db.ref(`spy_rooms/${roomCode}/voiceStates/${currentUserUid}`).remove();
      await db.ref(`spy_rooms/${roomCode}/voiceSignaling/${currentUserUid}`).remove();
    } catch {
      // ignore
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
