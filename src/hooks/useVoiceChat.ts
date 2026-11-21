import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { VoiceUserState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

type VoiceSignalPayload =
  | { kind: 'offer'; fromUid: string; toUid: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; fromUid: string; toUid: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'candidate'; fromUid: string; toUid: string; candidate: RTCIceCandidateInit };

export function useVoiceChat({
  roomCode,
  currentUserUid,
  currentUserName,
  onToast,
  permissionErrorMsg = 'Please allow microphone access to use voice chat.'
}: Props) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<Record<string, VoiceUserState>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const isJoinedRef = useRef<boolean>(false);
  const isDeafenedRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const lastSpeakingUpdateRef = useRef<number>(0);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);

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

  const fetchVoiceStates = useCallback(async () => {
    if (!roomCode) return;
    const { data } = await supabase
      .from('room_voice_states')
      .select('uid, name, muted, deafened, speaking, active, updated_at')
      .eq('room_code', roomCode);

    const map: Record<string, VoiceUserState> = {};
    for (const row of data || []) {
      map[row.uid] = {
        uid: row.uid,
        name: row.name,
        muted: !!row.muted,
        deafened: !!row.deafened,
        speaking: !!row.speaking,
        active: !!row.active,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
      };
    }
    setVoiceUsers(map);
  }, [roomCode]);

  // Sync voiceStates via Postgres Changes
  useEffect(() => {
    if (!roomCode) {
      setVoiceUsers({});
      return;
    }

    fetchVoiceStates();

    const stateChannel = supabase
      .channel(`voice-states:${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_voice_states', filter: `room_code=eq.${roomCode}` },
        () => fetchVoiceStates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
    };
  }, [roomCode, fetchVoiceStates]);

  const sendVoiceSignal = useCallback((payload: VoiceSignalPayload) => {
    const ch = signalChannelRef.current;
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload
    }).catch(() => {});
  }, []);

  const stopVolumeDetection = useCallback(() => {
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
  }, []);

  const startVolumeDetection = useCallback((stream: MediaStream) => {
    try {
      stopVolumeDetection();
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
              supabase
                .from('room_voice_states')
                .update({ speaking: nowSpeaking, updated_at: new Date().toISOString() })
                .eq('room_code', roomCode)
                .eq('uid', currentUserUid)
                .then(() => {});
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
  }, [roomCode, currentUserUid, stopVolumeDetection]);

  const drainCandidateQueue = async (peerUid: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current[peerUid];
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          // ignore
        }
      }
      pendingCandidatesRef.current[peerUid] = [];
    }
  };

  const createPeerConnection = useCallback((peerUid: string): RTCPeerConnection => {
    if (peerConnectionsRef.current[peerUid]) {
      return peerConnectionsRef.current[peerUid];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[peerUid] = pc;
    pendingCandidatesRef.current[peerUid] = [];

    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (e) {
      console.warn('Failed to addTransceiver:', e);
    }

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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendVoiceSignal({
          kind: 'candidate',
          fromUid: currentUserUid,
          toUid: peerUid,
          candidate: event.candidate.toJSON()
        });
      }
    };

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
  }, [currentUserUid, sendVoiceSignal]);

  // WebRTC signaling via Supabase Realtime Broadcast (ultra-fast, zero DB writes)
  useEffect(() => {
    if (!isJoined || !roomCode || !currentUserUid) return;

    const sigChannel = supabase.channel(`voice-signal:${roomCode}`, {
      config: { broadcast: { self: false } }
    });

    sigChannel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      const msg = payload as VoiceSignalPayload | undefined;
      if (!msg || msg.toUid !== currentUserUid || !msg.fromUid) return;

      const peerUid = msg.fromUid;
      let pc = peerConnectionsRef.current[peerUid];
      if (!pc) {
        pc = createPeerConnection(peerUid);
      }

      const isPolite = currentUserUid > peerUid;

      if (msg.kind === 'offer') {
        const offerCollision = pc.signalingState !== 'stable';
        if (offerCollision && !isPolite) return;
        try {
          if (offerCollision) {
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainCandidateQueue(peerUid, pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendVoiceSignal({
            kind: 'answer',
            fromUid: currentUserUid,
            toUid: peerUid,
            sdp: { type: answer.type, sdp: answer.sdp }
          });
        } catch (err) {
          console.error('Error handling voice offer:', err);
        }
      } else if (msg.kind === 'answer' && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainCandidateQueue(peerUid, pc);
        } catch (err) {
          console.error('Error handling voice answer:', err);
        }
      } else if (msg.kind === 'candidate') {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch {
            // ignore
          }
        } else {
          if (!pendingCandidatesRef.current[peerUid]) {
            pendingCandidatesRef.current[peerUid] = [];
          }
          pendingCandidatesRef.current[peerUid].push(msg.candidate);
        }
      }
    });

    sigChannel.subscribe();
    signalChannelRef.current = sigChannel;

    return () => {
      if (signalChannelRef.current === sigChannel) {
        signalChannelRef.current = null;
      }
      supabase.removeChannel(sigChannel);
    };
  }, [isJoined, roomCode, currentUserUid, createPeerConnection, sendVoiceSignal]);

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
          sendVoiceSignal({
            kind: 'offer',
            fromUid: currentUserUid,
            toUid: peer.uid,
            sdp: { type: offer.type, sdp: offer.sdp }
          });
        } catch (err) {
          console.error('Failed to create offer for peer:', peer.uid, err);
        }
      }
    }
  }, [voiceUsers, currentUserUid, createPeerConnection, sendVoiceSignal]);

  useEffect(() => {
    if (isJoined) {
      connectToActivePeers();
    }
  }, [isJoined, voiceUsers, connectToActivePeers]);

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
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
    }
  };

  const attachMicrophoneStream = useCallback(async (startMuted: boolean) => {
    const stream = await getSafeAudioStream();
    stream.getAudioTracks().forEach(track => {
      track.enabled = !startMuted;
    });
    localStreamRef.current = stream;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const entries = Object.entries(peerConnectionsRef.current);
      for (const [peerUid, pc] of entries) {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track?.kind === 'audio' || !s.track);
        if (sender) {
          await sender.replaceTrack(audioTrack).catch(() => {});
        } else {
          try {
            pc.addTrack(audioTrack, stream);
          } catch {
            // ignore
          }
        }
        pc.getTransceivers().forEach(tr => {
          if (tr.receiver.track?.kind === 'audio') {
            tr.direction = 'sendrecv';
          }
        });
        if (pc.signalingState === 'stable') {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendVoiceSignal({
              kind: 'offer',
              fromUid: currentUserUid,
              toUid: peerUid,
              sdp: { type: offer.type, sdp: offer.sdp }
            });
          } catch {
            // ignore
          }
        }
      }
    }

    startVolumeDetection(stream);
  }, [currentUserUid, sendVoiceSignal, startVolumeDetection]);

  const joinVoice = useCallback(async (startMuted: boolean = true) => {
    if (!roomCode || !currentUserUid) return;

    try {
      if (!startMuted) {
        await attachMicrophoneStream(false);
      }

      isJoinedRef.current = true;
      setIsJoined(true);
      setIsMuted(startMuted);
      setIsDeafened(false);
      isDeafenedRef.current = false;

      await supabase.from('room_voice_states').upsert({
        room_code: roomCode,
        uid: currentUserUid,
        name: currentUserName,
        muted: startMuted,
        deafened: false,
        speaking: false,
        active: true,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Voice join error:', err);
      onToast?.(permissionErrorMsg, 'danger');
    }
  }, [roomCode, currentUserUid, currentUserName, attachMicrophoneStream, onToast, permissionErrorMsg]);

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

    isJoinedRef.current = false;
    isDeafenedRef.current = false;
    setIsJoined(false);
    setIsMuted(true);
    setIsDeafened(false);
    setIsSpeaking(false);

    if (roomCode && currentUserUid) {
      try {
        await supabase
          .from('room_voice_states')
          .delete()
          .eq('room_code', roomCode)
          .eq('uid', currentUserUid);
      } catch {
        // ignore
      }
    }
  }, [roomCode, currentUserUid, stopVolumeDetection]);

  const toggleMute = useCallback(async () => {
    if (!isJoinedRef.current) {
      await joinVoice(false);
      return;
    }

    if (!localStreamRef.current) {
      try {
        await attachMicrophoneStream(false);
        setIsMuted(false);
        await supabase
          .from('room_voice_states')
          .update({ muted: false, updated_at: new Date().toISOString() })
          .eq('room_code', roomCode)
          .eq('uid', currentUserUid);
      } catch (err) {
        console.warn('Mic permission error on unmute:', err);
        onToast?.(permissionErrorMsg, 'danger');
      }
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextEnabled = !audioTrack.enabled;
      audioTrack.enabled = nextEnabled;
      const muted = !nextEnabled;
      setIsMuted(muted);
      await supabase
        .from('room_voice_states')
        .update({
          muted,
          ...(muted ? { speaking: false } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('room_code', roomCode)
        .eq('uid', currentUserUid);
      if (muted) {
        setIsSpeaking(false);
      }
    }
  }, [joinVoice, attachMicrophoneStream, roomCode, currentUserUid, onToast, permissionErrorMsg]);

  const toggleDeafen = useCallback(() => {
    if (!isJoinedRef.current) {
      joinVoice(true);
      return;
    }
    const nextDeafened = !isDeafenedRef.current;
    isDeafenedRef.current = nextDeafened;
    setIsDeafened(nextDeafened);

    Object.values(audioElementsRef.current).forEach(audioEl => {
      audioEl.muted = nextDeafened;
    });

    if (roomCode && currentUserUid) {
      supabase
        .from('room_voice_states')
        .update({ deafened: nextDeafened, updated_at: new Date().toISOString() })
        .eq('room_code', roomCode)
        .eq('uid', currentUserUid)
        .then(() => {});
    }
  }, [roomCode, currentUserUid, joinVoice]);

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
