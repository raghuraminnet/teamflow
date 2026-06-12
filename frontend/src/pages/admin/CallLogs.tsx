import React, { useState, useEffect } from 'react';
import { Phone, Search, ArrowLeft, CheckCircle, XCircle, PhoneMissed } from 'lucide-react';
import { voiceApi } from '../../lib/api';

interface CallLog {
  id: number; direction: string; fromNumber: string; toNumber: string;
  durationSecs: number | null; status: string | null; recordingUrl: string | null;
  transcript: string | null; summary: string | null; startedAt: string; endedAt: string | null;
}

const ICONS: Record<string, React.ReactNode> = {
  answered: <CheckCircle size={14} style={{ color: 'var(--success)' }} />,
  completed: <CheckCircle size={14} style={{ color: 'var(--success)' }} />,
  missed: <PhoneMissed size={14} style={{ color: '#f59e0b' }} />,
  failed: <XCircle size={14} style={{ color: 'var(--danger)' }} />,
};

export const CallLogs: React.FC = () => {
  const token = localStorage.getItem('token') || '';
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<CallLog | null>(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ totalCalls: 0, answered: 0, missed: 0, avgDurationSecs: 0 });

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        voiceApi.calls.list(token, { limit }) as Promise<{ data: CallLog[] }>,
        voiceApi.stats.summary(token) as Promise<{ data: typeof stats }>,
      ]);
      setCalls(c.data || []); setStats(s.data || { totalCalls: 0, answered: 0, missed: 0, avgDurationSecs: 0 });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCalls(); }, [limit]);

  const filtered = calls.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.fromNumber.includes(q) || c.toNumber.includes(q) || (c.summary || '').toLowerCase().includes(q);
  });

  const fmtDur = (s: number | null) => {
    if (!s) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Phone size={28} style={{ color: 'var(--accent-primary)' }} />
            Call History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>View all call logs, transcripts, and recordings</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {stats.totalCalls > 0 && (
            <div style={{ display: 'flex', gap: '16px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[{ v: stats.totalCalls, l: 'Total' }, { v: stats.answered, l: 'Answered', c: 'var(--success)' }, { v: stats.missed, l: 'Missed', c: '#f59e0b' }].map(x => (
                <div key={x.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (x as { v: number; l: string; c?: string }).c || undefined }}>{x.v}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{x.l}</div>
                </div>
              ))}
            </div>
          )}
          <select className="input" style={{ width: '120px' }} value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
            <option value={25}>25 calls</option>
            <option value={50}>50 calls</option>
            <option value={100}>100 calls</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" style={{ paddingLeft: '38px' }} placeholder="Search by phone or transcript..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '60px' }}>Loading call history...</div>
       : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Phone size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)' }}>{query ? 'No calls match search' : 'No call history yet'}</p>
        </div>
      ) : !selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(call => (
            <div key={call.id} className="glass-card" style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
              onClick={() => setSelected(call)}>
              <div style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>{call.direction === 'outbound' ? '→' : '←'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600 }}>{call.toNumber}</span>
                  {ICONS[call.status || ''] || null}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{call.status}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {call.direction === 'outbound' ? `From: ${call.fromNumber}` : `To: ${call.toNumber}`} · {new Date(call.startedAt).toLocaleString()}
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{fmtDur(call.durationSecs)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '24px' }}>
          <button className="btn btn-secondary" style={{ marginBottom: '16px', gap: '6px' }} onClick={() => setSelected(null)}><ArrowLeft size={14} /> Back</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {[['Direction', selected.direction], ['Status', selected.status], ['From', selected.fromNumber], ['To', selected.toNumber], ['Duration', fmtDur(selected.durationSecs)], ['Started', new Date(selected.startedAt).toLocaleString()]].map(([l, v]) => (
              <div key={l as string}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{l}</div><div style={{ fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
          {selected.summary && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>AI Summary</div><div style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', fontSize: '0.88rem', lineHeight: 1.6 }}>{selected.summary}</div></div>}
          {selected.transcript && <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Transcript</div><div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{selected.transcript}</div></div>}
          {selected.recordingUrl && <div style={{ marginTop: '16px' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Recording</div><audio controls style={{ width: '100%' }}><source src={selected.recordingUrl} type="audio/wav" />Your browser does not support audio.</audio></div>}
        </div>
      )}
    </div>
  );
};