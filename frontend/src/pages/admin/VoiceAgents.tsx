import React, { useState, useEffect } from 'react';
import { Mic, Plus, Trash2, Edit2, Phone, Play, Pause } from 'lucide-react';
import { voiceApi } from '../../lib/api';

interface AgentStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
  nextStepId?: string;
  branchConditions?: { keyword: string; nextStepId: string }[];
}

interface Agent {
  id: number;
  name: string;
  description: string;
  type: string;
  steps: AgentStep[];
  prompt: string;
  voiceId: string;
  llmProvider: string;
  llmModel: string;
  isActive: boolean;
  createdAt: string;
  recentCalls?: CallEntry[];
}

interface CallEntry {
  id: number; direction: string; toNumber: string; durationSecs: number; status: string; startedAt: string;
}

const STEP_TYPES = [
  { value: 'speak', label: 'Speak (TTS)', icon: '🎙️' },
  { value: 'collect', label: 'Collect (STT)', icon: '🎤' },
  { value: 'condition', label: 'Branch', icon: '🔀' },
  { value: 'transfer', label: 'Transfer', icon: '📞' },
  { value: 'task_update', label: 'Task Update', icon: '✅' },
  { value: 'delay', label: 'Wait/Delay', icon: '⏳' },
  { value: 'end', label: 'End Call', icon: '⏹️' },
];

const DEFAULT_CONFIG: Record<string, Record<string, unknown>> = {
  speak: { message: 'Hello, this is a message from TeamFlow.' },
  collect: { prompt: 'Please speak after the tone.', timeoutSecs: 10 },
  transfer: { transferTo: '', announce: 'Transferring your call now.' },
  delay: { delayMs: 2000 },
  end: { message: 'Thank you for calling. Goodbye!' },
  task_update: { taskId: '', updateData: {} },
  condition: { branches: [] },
};

export const VoiceAgents: React.FC = () => {
  const token = localStorage.getItem('token') || '';
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Agent>>({
    name: '', description: '', type: 'outbound_campaign', steps: [],
    prompt: 'You are a professional AI voice assistant. Be concise, friendly, and helpful.',
    voiceId: 'en_US-amy-medium', llmProvider: 'minimax', llmModel: 'MiniMax-Text-01',
  });

  const fetchAgents = async () => {
    try {
      const data = await voiceApi.agents.list(token) as { data: Agent[] };
      setAgents(data.data || []);
    } catch { setAgents([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleSave = async () => {
    try {
      if (editingId) await voiceApi.agents.update(token, editingId, form);
      else await voiceApi.agents.create(token, form);
      setShowModal(false); setEditingId(null); resetForm(); fetchAgents();
    } catch (err) { alert(`Save failed: ${err}`); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this agent?')) return;
    try { await voiceApi.agents.delete(token, id); fetchAgents(); }
    catch (err) { alert(`Delete failed: ${err}`); }
  };

  const handleEdit = (agent: Agent) => {
    setForm({ ...agent });
    setEditingId(agent.id);
    setShowModal(true);
  };

  const resetForm = () => setForm({
    name: '', description: '', type: 'outbound_campaign', steps: [],
    prompt: 'You are a professional AI voice assistant. Be concise, friendly, and helpful.',
    voiceId: 'en_US-amy-medium', llmProvider: 'minimax', llmModel: 'MiniMax-Text-01',
  });

  const addStep = (type: string) => {
    setForm(f => ({ ...f, steps: [...(f.steps || []), { id: `step_${Date.now()}`, type, config: DEFAULT_CONFIG[type] || {} }] }));
  };

  const updateStep = (i: number, u: Partial<AgentStep>) => {
    setForm(f => ({ ...f, steps: f.steps?.map((s, idx) => idx === i ? { ...s, ...u } : s) }));
  };

  const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps?.filter((_, idx) => idx !== i) }));

  const fmtDuration = (s: number) => { const m = Math.floor(s / 60), sec = s % 60; return m > 0 ? `${m}m ${sec}s` : `${sec}s`; };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mic size={28} style={{ color: 'var(--accent-primary)' }} />
            Voice Agents
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Build AI voice agents with step flows for outbound campaigns & inbound IVR
          </p>
        </div>
        <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff', gap: '8px' }}
          onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading...</div>
       : agents.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Mic size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <h3>No Voice Agents Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Create your first AI voice agent</p>
          <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> Create Agent
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {agents.map(a => (
            <div key={a.id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.name}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                      background: a.type === 'outbound_campaign' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                      color: a.type === 'outbound_campaign' ? 'var(--success)' : 'var(--accent-primary)' }}>
                      {a.type === 'outbound_campaign' ? '📞 Outbound' : a.type === 'inbound_ivr' ? '☎️ IVR' : '📋 Status Check'}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                      background: a.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: a.isActive ? 'var(--success)' : 'var(--danger)' }}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleEdit(a)} title="Edit"><Edit2 size={14} /></button>
                  <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(a.id)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
              {a.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{a.description}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {(a.steps || []).slice(0, 5).map((s, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    {STEP_TYPES.find(x => x.value === s.type)?.icon} {s.type}
                  </span>
                ))}
                {(a.steps || []).length > 5 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{a.steps.length - 5} more</span>}
              </div>
              {a.recentCalls && a.recentCalls.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Recent calls</div>
                  {a.recentCalls.slice(0, 2).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '2px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.direction === 'outbound' ? '→' : '←'} {c.toNumber}</span>
                      <span style={{ color: c.status === 'answered' ? 'var(--success)' : 'var(--text-muted)' }}>{fmtDuration(c.durationSecs || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                {a.llmProvider === 'minimax' ? '🤖 MiniMax' : a.llmProvider === 'openai' ? '🤖 OpenAI' : '🤖 Ollama'} · {a.llmModel}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingId ? 'Edit Voice Agent' : 'Create Voice Agent'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Agent Name *</label>
                <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Call Agent" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <input className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Agent Type *</label>
                <select className="input" value={form.type || 'outbound_campaign'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="outbound_campaign">📞 Outbound Campaign</option>
                  <option value="inbound_ivr">☎️ Inbound IVR</option>
                  <option value="status_check">📋 Daily Status Check</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>System Prompt</label>
                <textarea className="input" rows={3} value={form.prompt || ''} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>LLM Provider</label>
                  <select className="input" value={form.llmProvider || 'minimax'} onChange={e => setForm(f => ({ ...f, llmProvider: e.target.value }))}>
                    <option value="minimax">MiniMax</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Self-hosted)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>LLM Model</label>
                  <input className="input" value={form.llmModel || ''} onChange={e => setForm(f => ({ ...f, llmModel: e.target.value }))}
                    placeholder={form.llmProvider === 'minimax' ? 'MiniMax-Text-01' : form.llmProvider === 'openai' ? 'gpt-4o-mini' : 'llama3.2:latest'} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Voice ID</label>
                <input className="input" value={form.voiceId || ''} onChange={e => setForm(f => ({ ...f, voiceId: e.target.value }))} />
              </div>

              {/* Step builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Call Flow Steps</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {STEP_TYPES.map(st => (
                      <button key={st.value} className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 10px', gap: '4px' }}
                        onClick={() => addStep(st.value)}>{st.icon} {st.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(form.steps || []).map((step, i) => (
                    <div key={step.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>{i + 1}</span>
                          {STEP_TYPES.find(x => x.value === step.type)?.icon} {step.type}
                        </span>
                        <button className="btn btn-secondary" style={{ padding: '4px', color: 'var(--danger)', fontSize: '0.7rem' }} onClick={() => removeStep(i)}><Trash2 size={12} /></button>
                      </div>
                      {step.type === 'speak' && (
                        <textarea className="input" rows={2} placeholder="Message to speak..."
                          value={(step.config?.message as string) || ''} onChange={e => updateStep(i, { config: { ...step.config, message: e.target.value } })} />
                      )}
                      {step.type === 'collect' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input className="input" placeholder="Prompt" value={(step.config?.prompt as string) || ''}
                            onChange={e => updateStep(i, { config: { ...step.config, prompt: e.target.value } })} />
                          <input className="input" type="number" placeholder="Timeout (sec)" value={(step.config?.timeoutSecs as number) || 10}
                            onChange={e => updateStep(i, { config: { ...step.config, timeoutSecs: parseInt(e.target.value) || 10 } })} />
                        </div>
                      )}
                      {step.type === 'transfer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input className="input" placeholder="Transfer to number" value={(step.config?.transferTo as string) || ''}
                            onChange={e => updateStep(i, { config: { ...step.config, transferTo: e.target.value } })} />
                          <input className="input" placeholder="Announce message" value={(step.config?.announce as string) || ''}
                            onChange={e => updateStep(i, { config: { ...step.config, announce: e.target.value } })} />
                        </div>
                      )}
                      {step.type === 'delay' && (
                        <input className="input" type="number" placeholder="Delay (ms)" value={(step.config?.delayMs as number) || 2000}
                          onChange={e => updateStep(i, { config: { ...step.config, delayMs: parseInt(e.target.value) || 2000 } })} />
                      )}
                      {step.type === 'end' && (
                        <input className="input" placeholder="Goodbye message" value={(step.config?.message as string) || ''}
                          onChange={e => updateStep(i, { config: { ...step.config, message: e.target.value } })} />
                      )}
                    </div>
                  ))}
                  {(form.steps || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                      Click step types above to build your call flow
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={handleSave} disabled={!form.name}>
                {editingId ? 'Update' : 'Create'} Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};