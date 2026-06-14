// src/pages/admin/VoiceCall.tsx
// Browser-side standalone voice call page — no external APIs needed
// Route: /admin/voice-call/:agentId

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Mic, MicOff, Volume2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useWebRTCCall, type CallState } from '@/hooks/useWebRTCCall';
import { AdminLayout } from '@/layouts/AppLayout';

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let analyser: AnalyserNode | null = null;
    let ac: AudioContext | null = null;

    try {
      ac = new AudioContext();
      const source = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
    } catch {
      return;
    }

    if (!analyser) return;

    const draw = () => {
      const data = new Uint8Array(analyser!.frequencyBinCount);
      analyser!.getByteFrequencyData(data);
      ctx.clearRect(0, 0, 300, 60);
      const barW = 300 / data.length;
      for (let i = 0; i < data.length; i++) {
        const h = (data[i] / 255) * 60;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(i * barW, 60 - h, Math.max(barW - 1, 1), h);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      ac?.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      style={{ width: '100%', height: '60px', borderRadius: '8px', background: '#0f172a', display: 'block' }}
    />
  );
}

const VoiceCall: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Fetch agent name
  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/voice/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then(r => r.json())
      .then(d => { if (d.data?.name) setAgentName(d.data.name); })
      .catch(() => {});
  }, [agentId]);

  const { state, startCall, endCall } = useWebRTCCall({
    agentId: agentId || '',
    gatewayUrl: '',
    onCallStart: () => { setDuration(0); },
    onCallEnd: (summary) => console.log('[VoiceCall] Ended:', summary),
    onError: (err) => console.error('[VoiceCall] Error:', err),
  });

  // Duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.status === 'connected') {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state.status]);

  // Request mic permission early
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  const handleStartCall = async () => {
    if (hasPermission === false) {
      alert('Microphone permission denied. Please allow mic access in your browser settings.');
      return;
    }
    await startCall();
  };

  const toggleMute = () => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }
    setMuted(m => !m);
  };

  const toggleSpeaker = () => {
    if (state.remoteStream) {
      const audio = document.querySelector('audio');
      if (audio && audio.srcObject !== state.remoteStream) {
        audio.srcObject = state.remoteStream;
      }
      audio?.play().catch(() => {});
    }
    setSpeakerOn(s => !s);
  };

  const statusLabel: Record<CallState['status'], string> = {
    idle: 'Ready — click Call to start',
    connecting: 'Connecting to agent...',
    ringing: 'Agent is responding...',
    connected: 'Call in progress',
    ended: 'Call ended',
  };

  const statusColorMap: Record<CallState['status'], string> = {
    idle: 'var(--text-secondary)',
    connecting: '#f59e0b',
    ringing: '#f59e0b',
    connected: 'var(--success)',
    ended: 'var(--text-secondary)',
  };

  const canCall = state.status === 'idle' || state.status === 'ended';

  return (
    <AdminLayout title="Voice Call">
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/admin/voice-agents')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Agents
        </button>

        {/* Agent info */}
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Voice Agent</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{agentName || `Agent #${agentId}`}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ID: {agentId}
          </div>
        </div>

        {/* Audio visualizer */}
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {state.status === 'connected' ? 'Your voice (live)' : 'Audio visualizer'}
          </div>
          <AudioVisualizer stream={state.localStream} />
        </div>

        {/* Status + Duration */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: statusColorMap[state.status] }}>
            {formatDuration(duration)}
          </div>
          <div style={{ fontSize: '0.85rem', color: statusColorMap[state.status], marginTop: '4px' }}>
            {statusLabel[state.status]}
          </div>
          {state.error && (
            <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '8px', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
              Error: {state.error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>

          {/* Mute */}
          <button
            onClick={toggleMute}
            disabled={state.status !== 'connected'}
            style={{
              width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: state.status === 'connected' ? 'pointer' : 'not-allowed',
              background: muted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              color: muted ? 'var(--danger)' : 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: state.status === 'connected' ? 1 : 0.4,
            }}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Call / End */}
          {canCall ? (
            <button
              onClick={handleStartCall}
              style={{
                width: '72px', height: '72px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'var(--success)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Start Call"
            >
              <Phone size={28} />
            </button>
          ) : (
            <button
              onClick={endCall}
              style={{
                width: '72px', height: '72px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'var(--danger)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="End Call"
            >
              <PhoneOff size={28} />
            </button>
          )}

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            disabled={state.status !== 'connected'}
            style={{
              width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: state.status === 'connected' ? 'pointer' : 'not-allowed',
              background: speakerOn ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
              color: speakerOn ? 'var(--success)' : 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: state.status === 'connected' ? 1 : 0.4,
            }}
            title={speakerOn ? 'Disable speaker' : 'Enable speaker'}
          >
            <Volume2 size={22} />
          </button>
        </div>

        {/* Mic permission notice */}
        {hasPermission === null && canCall && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Checking microphone access...
          </div>
        )}
        {hasPermission === false && canCall && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--danger)' }}>
            ⚠️ Microphone access denied — click the button to allow
          </div>
        )}

        {/* How it works */}
        <div className="glass-card" style={{ padding: '16px', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>How this works 🔥</div>
          <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.7 }}>
            <li>Click the green phone to start a WebRTC call</li>
            <li>Your mic captures audio → sent to the AI agent</li>
            <li>AI responds with voice → played back to you</li>
            <li>100% self-hosted — no Twilio, no Asterisk, no external costs</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default VoiceCall;