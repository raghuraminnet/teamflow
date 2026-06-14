import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
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
        voiceApi.campaigns.list() as Promise<{ data: Campaign[] }>,
        voiceApi.agents.list() as Promise<{ data: { id: number; name: string }[] }>,
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
      await voiceApi.campaigns.create( { ...form, scheduleAt: form.scheduleAt || undefined, contacts: parseContacts(contactsText) });
      setShowModal(false); setForm({ agentId: 0, name: '', description: '', scheduleAt: '' }); setContactsText(''); fetchAll();
    } catch (err) { alert(`Failed: ${err}`); }
  };

  const handleRun = async (id: number) => { try { await voiceApi.campaigns.run( id); fetchAll(); } catch (err) { alert(`Failed: ${err}`); } };
  const handleStop = async (id: number) => { try { await voiceApi.campaigns.stop( id); fetchAll(); } catch (err) { alert(`Failed: ${err}`); } };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  return (
      <AdminLayout>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PhoneOutgoing size={28} style={{ color: 'var(--accent-primary)' }} />
                Call Campaigns
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Create and manage outbound voice campaigns</p>
            </div>
            <button className="btn" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Campaign
            </button>
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: '60px' }}>Loading campaigns...</div>
           : campaigns.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <PhoneOutgoing size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No campaigns yet. Create your first one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campaigns.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{c.name}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: STATUS_COLORS[c.status] + '22', color: STATUS_COLORS[c.status] }}>{c.status}</span>
                      </div>
                      {c.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {c.status === 'draft' || c.status === 'paused' ? (
                        <button className="btn btn-secondary" style={{ gap: '6px' }} onClick={() => voiceApi.campaigns.run(c.id).then(() => fetchAll())}>
                          <Play size={14} /> Run
                        </button>
                      ) : c.status === 'running' ? (
                        <button className="btn btn-secondary" style={{ gap: '6px' }} onClick={() => voiceApi.campaigns.stop(c.id).then(() => fetchAll())}>
                          <Pause size={14} /> Stop
                        </button>
                      ) : null}
                      {c.status !== 'running' && (
                        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => { if (confirm('Delete campaign?')) voiceApi.campaigns.delete(c.id).then(() => fetchAll()); }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {c.resultJson ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', padding: '12px 0 0', borderTop: '1px solid var(--border-color)' }}>
                      {[{ label: 'Total', val: c.resultJson.total, color: '' }, { label: 'Answered', val: c.resultJson.answered, color: 'var(--success)' }, { label: 'Missed', val: c.resultJson.missed, color: '#f59e0b' }, { label: 'Failed', val: c.resultJson.failed, color: 'var(--danger)' }, { label: 'Avg', val: c.resultJson.avgDurationSecs ? `${Math.floor(c.resultJson.avgDurationSecs/60)}m ${c.resultJson.avgDurationSecs%60}s` : '—', color: '' }].map(x => (
                        <div key={x.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: x.color || undefined }}>{x.val ?? 0}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{x.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.scheduleAt ? `Scheduled: ${new Date(c.scheduleAt).toLocaleString()}` : 'Not scheduled'} · Contacts: {c.contactsJson?.length ?? 0}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
              <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '520px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Campaign</h2>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Campaign Name</label>
                    <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Outreach" /></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Voice Agent</label>
                    <select className="input" value={form.agentId || 0} onChange={e => setForm(f => ({ ...f, agentId: parseInt(e.target.value) }))}>
                      <option value={0}>Select agent...</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select></div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Contacts (one per line, name,phone)</label>
                    <textarea className="input" rows={6} value={contactsText} onChange={e => setContactsText(e.target.value)} placeholder="John Doe, +1234567890
Jane Smith, +0987654321" /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Leave empty for immediate send, or set a date/time below</div>
                  <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Schedule (optional)</label>
                    <input className="input" type="datetime-local" value={form.scheduleAt || ''} onChange={e => setForm(f => ({ ...f, scheduleAt: e.target.value }))} /></div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={handleSave} disabled={!form.name || !form.agentId}>Create Campaign</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  };
  export default Campaigns;
