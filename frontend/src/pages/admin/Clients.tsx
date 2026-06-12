import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input, Textarea, Select } from '@/components/FormFields';
import { Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });

  const loadClients = () => {
    api.getClients(search ? { search } : undefined).then((d: any) => {
      setClients(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, [search]);

  const openCreate = () => { setEditClient(null); setForm({ name: '', email: '', phone: '', company: '', notes: '' }); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditClient(c); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', company: c.company ?? '', notes: c.notes ?? '' }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editClient) {
        await api.updateClient(editClient.id, form);
      } else {
        await api.createClient(form);
      }
      closeModal();
      loadClients();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteClient(deleteTarget.id);
    setDeleteTarget(null);
    loadClients();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 text-sm mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Add Client</Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-6 py-4 flex gap-4 border-b border-gray-50">
                <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-40" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400">No clients yet. Add your first client to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size="md" />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.company ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.email ?? c.phone ?? '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editClient ? 'Edit Client' : 'Add Client'}>
        <div className="space-y-4">
          <Field label="Name" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client name" /></Field>
          <Field label="Company"><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+60..." /></Field>
          </div>
          <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={2} /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editClient ? 'Save Changes' : 'Add Client'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Delete "${deleteTarget?.name}"? All associated projects and tasks will be removed.`}
        confirmLabel="Delete"
        danger
      />
    </AdminLayout>
  );
}