// src/pages/admin/VoiceCall.tsx
// Browser-side standalone voice call UI — no external APIs needed

import React, { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useWebRTCCall, type CallState } from '@/hooks/useWebRTCCall';
import { AdminLayout } from '@/layouts/AppLayout';

interface VoiceCallProps {
  agentId: number;
  agentName?: string;
  onClose?: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const analyser = (() => {
      try {
        const ac = new AudioContext();
        const source = ac.createMediaStreamSource(stream);
        const a = ac.createAnalyser();
        a.fftSize = 256;
        source.connect(a);
        return a;
      } catch { return null; }
    })();
    if (!analyser) return;

    const draw = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, 300, 60);
      const barW = 300 / data.length;
      for (let i = 0; i < data.length; i++) {
        const h = (data[i] / 255) * 60;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(i * barW, 60 - h, barW - 1, h);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [stream]);

  return (
    <canvas ref={canvasRef} width={300} height={60} className="w-full h-[60px] rounded-lg bg-gray-900" />
  );
}

export const VoiceCall: React.FC<VoiceCallProps> = ({ agentId, agentName, onClose }) => {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const { state, startCall, endCall } = useWebRTCCall({
    agentId,
    gatewayUrl: '', // auto-detects port 3004
    onCallStart: () => console.log('[VoiceCall] Call started'),
    onCallEnd: (summary) => console.log('[VoiceCall] Call ended', summary),
    onError: (err) => console.error('[VoiceCall] Error:', err),
  });

  const toggleMute = () => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }
    setMuted(m => !m);
  };

  const statusLabel: Record<CallState['status'], string> = {
    idle: 'Ready to call',
    connecting: 'Connecting...',
    ringing: 'Ringing...',
    connected: 'Connected',
    ended: 'Call ended',
  };

  const statusColor: Record<CallState['status'], string> = {
    idle: 'text-gray-400',
    connecting: 'text-yellow-400',
    ringing: 'text-yellow-400',
    connected: 'text-green-400',
    ended: 'text-gray-400',
  };

  return (
    <AdminLayout title="Voice Call">
      <div className="max-w-md mx-auto space-y-6">

        {/* Status */}
        <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-4">
          {/* Avatar circle */}
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold transition-colors ${
            state.status === 'connected' ? 'bg-green-600' :
            state.status === 'ringing' ? 'bg-yellow-600 animate-pulse' :
            'bg-gray-700'
          }`}>
            🤖
          </div>

          <div>
            <p className="text-white font-semibold text-lg">{agentName || 'Voice Agent'}</p>
            <p className={`text-sm ${statusColor[state.status]}`}>{statusLabel[state.status]}</p>
            {state.status === 'connected' && (
              <p className="text-green-400 font-mono text-2xl mt-1">{formatDuration(state.duration)}</p>
            )}
            {state.error && (
              <p className="text-red-400 text-sm mt-1">{state.error}</p>
            )}
          </div>

          {/* Audio visualizer when connected */}
          {(state.status === 'connected' || state.status === 'ringing') && (
            <AudioVisualizer stream={state.localStream} />
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {state.status === 'idle' && (
            <button
              onClick={startCall}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white transition-colors shadow-lg"
            >
              <Phone className="w-7 h-7" />
            </button>
          )}

          {(state.status === 'connecting' || state.status === 'ringing') && (
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors shadow-lg animate-pulse"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          )}

          {state.status === 'connected' && (
            <>
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                  muted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                } text-white`}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors shadow-lg"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={() => setSpeakerOn(s => !s)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                  speakerOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                } text-white`}
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </>
          )}

          {state.status === 'ended' && (
            <button
              onClick={startCall}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white transition-colors shadow-lg"
            >
              <Phone className="w-7 h-7" />
            </button>
          )}
        </div>

        {state.status === 'idle' && (
          <p className="text-center text-gray-400 text-sm">
            Click to start a call — fully self-hosted, no external services
          </p>
        )}

        {/* Close */}
        {onClose && state.status === 'idle' && (
          <button onClick={onClose} className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm">
            ← Back
          </button>
        )}
      </div>
    </AdminLayout>
  );
};