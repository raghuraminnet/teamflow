// src/hooks/useWebRTCCall.ts
// Browser-side WebRTC calling — no external APIs, fully standalone

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface CallState {
  status: 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  roomId: string | null;
  error: string | null;
  duration: number;
}

interface UseWebRTCCallOptions {
  agentId: string | number;
  gatewayUrl?: string;
  userId?: number;
  userName?: string;
  onCallStart?: () => void;
  onCallEnd?: (summary?: string) => void;
  onError?: (err: string) => void;
}

export function useWebRTCCall(options: UseWebRTCCallOptions) {
  const { agentId, gatewayUrl = '', userId, userName, onCallStart, onCallEnd, onError } = options;

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<CallState>({
    status: 'idle',
    localStream: null,
    remoteStream: null,
    roomId: null,
    error: null,
    duration: 0,
  });

  const getGatewayUrl = useCallback(() => {
    if (gatewayUrl) return gatewayUrl;
    // Default to current origin with webrtc path
    return window.location.origin.replace(/:\d+$/, ':3004');
  }, [gatewayUrl]);

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(getGatewayUrl(), {
      path: '/webrtc',
      transports: ['websocket'],
    });

    socket.on('connect', () => console.log('[WebRTC] Socket connected'));
    socket.on('disconnect', () => console.log('[WebRTC] Socket disconnected'));
    socket.on('connect_error', (err) => {
      setState(s => ({ ...s, error: `Connection failed: ${err.message}` }));
      onError?.(`Connection failed: ${err.message}`);
    });

    // Agent joined the room
    socket.on('agent-joined', () => {
      console.log('[WebRTC] AI agent joined');
      setState(s => ({ ...s, status: 'ringing' }));
    });

    // Room is active — start WebRTC
    socket.on('room-active', () => {
      console.log('[WebRTC] Room active');
      setState(s => ({ ...s, status: 'connecting' }));
    });

    // ICE candidate from agent
    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] ICE candidate error:', err);
      }
    });

    // Agent hungup
    socket.on('peer-hungup', () => {
      endCall();
      onCallEnd?.();
    });

    // Agent left
    socket.on('peer-left', () => {
      endCall();
      onCallEnd?.();
    });

    socketRef.current = socket;
    return socket;
  }, [getGatewayUrl, onCallEnd, onError]);

  const startCall = useCallback(async () => {
    setState(s => ({ ...s, error: null, duration: 0 }));
    const socket = initSocket();

    // 1. Get user media
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const msg = 'Microphone access denied';
      setState(s => ({ ...s, error: msg }));
      onError?.(msg);
      return;
    }
    localStreamRef.current = stream;
    setState(s => ({ ...s, localStream: stream, status: 'connecting' }));

    // 2. Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      setState(s => ({ ...s, remoteStream: event.streams[0] }));
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('ice-candidate', { candidate: candidate.toJSON() });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setState(s => ({ ...s, status: 'connected' }));
        onCallStart?.();
        // Start duration timer
        timerRef.current = setInterval(() => {
          setState(s => ({ ...s, duration: s.duration + 1 }));
        }, 1000);
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // 3. Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 4. Initiate call via socket
    const callerPeerId = `caller-${crypto.randomUUID?.()?.slice(0, 8) || Date.now()}`;
    const socket2 = socket as any;
    socket.emit('initiate-call', {
      agentId,
      userId,
      userName,
      callerPeerId,
    }, async (response: { success?: boolean; roomId?: string; error?: string }) => {
      if (response.error) {
        setState(s => ({ ...s, error: response.error || 'Call failed', status: 'idle' }));
        onError?.(response.error || 'Call failed');
        return;
      }

      setState(s => ({ ...s, roomId: response.roomId || null }));

      // Wait for room-active, then send the offer
      socket.once('room-active', async () => {
        // Send the SDP offer to the gateway
        socket.emit('send-offer', {
          roomId: response.roomId,
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        });
      });
    });
  }, [agentId, userId, userName, initSocket, onCallStart, onError]);

  const endCall = useCallback(() => {
    // Stop duration timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Close peer connection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    // Notify gateway
    const roomId = state.roomId;
    if (roomId && socketRef.current?.connected) {
      socketRef.current.emit('hangup', { roomId });
    }

    setState({
      status: 'ended',
      localStream: null,
      remoteStream: null,
      roomId: null,
      error: null,
      duration: 0,
    });
  }, [state.roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
      socketRef.current?.disconnect();
    };
  }, [endCall]);

  return { state, startCall, endCall };
}