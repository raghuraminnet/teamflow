import React, { useState, useEffect } from 'react';
import { PhoneOutgoing, Plus, Play, Pause, Trash2, Clock } from 'lucide-react';
import { voiceApi } from '../../lib/api';

interface Contact { name: string; phone: string; variables: Record<string, string>; }
interface Campaign {
  id: number; agentId: number; name: string; description: string;
  status: string; scheduleAt: string | null; contactsJson: Contact[];
  resultJson: { total: number; answered: number; missed: number; failed: number; avgDurationSecs: number; } | null;
  createdAt: string; startedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-muted)', scheduled: '#f59e0b', running: 'var(--accent-primary)',
  paused: '#f59e0b', completed: 'var(--success)', failed: 'var(--danger)',
};

export const Campaigns: React.FC = () => {
  const token = localStorage.getItem('token') || '';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [contactsText, setContactsText] = useState('');
  const [form, setForm] = useState<Partial<Campaign>>({ agentId: 0, name: '', description: '', scheduleAt: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        voiceApi.campaigns.list(token) as Promise<{ data: Campaign[] }>,
        voiceApi.agents.list(token) as Promise<{ data: { id: number; name: string }[] }>,
      ]);
      setCampaigns(c.data || []); setAgents(a.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const parseContacts = (t: string) => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split(/[,\t]+/).map(x => x.trim());
    return { name: p[0] || 'Unknown', phone: p[1] || p[0] || '', variables: {} };
  });

  const handleSave = async () => {
    try {
      await voiceApi.campaigns.create(token, { ...form, scheduleAt: form.scheduleAt || undefined, contacts: parseContacts(contactsText) });
      setShowModal(false); setForm({ agentId: 0, name: '', description: '', scheduleAt: '' }); setContactsText(''); fetchAll();
    } catch (err) { alert(`Failed: ${err}`); }
  };

  const handleRun = async (id: number) => { try { await voiceApi.campaigns.run(token, id); fetchAll(); } catch (err) { alert(`Failed: ${err}`); } };
  const handleStop = async (id: number) => { try { await voiceApi.campaigns.stop(token, id); fetchAll(); } catch (err) { alert(`Failed: ${err}`); } };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PhoneOutgoing size={28} style={{ color: 'var(--accent-primary)' }} />
            Call Campaigns
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Schedule and run automated outbound call campaigns</p>
        </div>
        <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff', gap: '8px' }}
          onClick={() => { setForm({ agentId: 0, name: '', description: '', scheduleAt: '' }); setContactsText(''); setShowModal(true); }}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
       : campaigns.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <PhoneOutgoing size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <h3>No Campaigns Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Create a campaign and upload contacts to start automated calling</p>
          <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {campaigns.map(c => (
            <div key={c.id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 10px', borderRadius: '12px', background: `${STATUS_COLORS[c.status] || 'gray'}20`, color: STATUS_COLORS[c.status] || 'gray', fontWeight: 600 }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Agent #{c.agentId} · {(c.contactsJson || []).length} contacts
                    {c.scheduleAt && <> · <Clock size={12} style={{ display: 'inline' }} /> {fmt(c.scheduleAt)}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {c.status === 'running' ? (
                    <button className="btn btn-secondary" style={{ gap: '6px', color: '#f59e0b' }} onClick={() => handleStop(c.id)}><Pause size={14} /> Stop</button>
                  ) : (
                    <button className="btn btn-secondary" style={{ gap: '6px', color: 'var(--success)' }} onClick={() => handleRun(c.id)}><Play size={14} /> Start</button>
                  )}
                  <button className="btn btn-secondary" style={{ padding: '8px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
              {c.resultJson && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  {[{ label: 'Total', val: c.resultJson.total, color: '' }, { label: 'Answered', val: c.resultJson.answered, color: 'var(--success)' }, { label: 'Missed', val: c.resultJson.missed, color: '#f59e0b' }, { label: 'Failed', val: c.resultJson.failed, color: 'var(--danger)' }, { label: 'Avg Dur', val: `${Math.round(c.resultJson.avgDurationSecs)}s`, color: '' }].map(x => (
                    <div key={x.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: x.color || undefined }}>{x.val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{x.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '28px' }}>
            <h2 style={{ marginBottom: '24px' }}>New Campaign</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Campaign Name *</label>
                <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q3 Outreach" /></div>
              <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Voice Agent *</label>
                <select className="input" value={form.agentId || 0} onChange={e => setForm(f => ({ ...f, agentId: parseInt(e.target.value) }))}>
                  <option value={0}>Select agent...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></div>
              <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Contacts (name,phone per line)</label>
                <textarea className="input" rows={6} value={contactsText} onChange={e => setContactsText(e.target.value)}
                  placeholder="John Doe, +1234567890\nJane Smith, +0987654321" />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{parseContacts(contactsText).length} contacts parsed</div></div>
              <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Schedule (optional)</label>
                <input className="input" type="datetime-local" value={form.scheduleAt || ''} onChange={e => setForm(f => ({ ...f, scheduleAt: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={handleSave} disabled={!form.name || !form.agentId}>Create Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};