import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input, Select } from '@/components/FormFields';
import { Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Shield, User } from 'lucide-react';

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'team_member' });

  const loadUsers = () => {
    api.getUsers().then((d: any) => { setUsers(d.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createUser(form);
      closeModal();
      loadUsers();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    loadUsers();
  };

  const closeModal = () => setModalOpen(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-500 text-sm mt-1">{users.length} member{users.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Invite Member</Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div>
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {u.role === 'admin' ? 'Admin' : 'Team Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="Invite Team Member">
        <div className="space-y-4">
          <Field label="Full Name" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" /></Field>
          <Field label="Password" required><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></Field>
          <Field label="Role">
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none">
              <option value="team_member">Team Member</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Send Invite</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Remove Member" message={`Remove "${deleteTarget?.name}" from the team?`} confirmLabel="Remove" danger />
    </AdminLayout>
  );
}