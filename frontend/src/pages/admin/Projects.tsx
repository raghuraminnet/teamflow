import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input, Textarea, Select } from '@/components/FormFields';
import { ProjectStatusBadge, Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Search, FolderKanban, Edit2, Trash2, ChevronRight } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  clientId?: number;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'active' });

  const load = () => {
    Promise.all([
      api.getProjects(statusFilter ? { status: statusFilter } as any : undefined),
      api.getClients(),
    ]).then(([projData, clientData]: any[]) => {
      let projs: Project[] = projData.data;
      if (search) projs = projs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      setProjects(projs);
      setClients(clientData.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openCreate = () => { setEditProject(null); setForm({ name: '', description: '', clientId: '', status: 'active' }); setModalOpen(true); };
  const openEdit = (p: Project) => { setEditProject(p); setForm({ name: p.name, description: p.description ?? '', clientId: p.clientId?.toString() ?? '', status: p.status }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form, clientId: form.clientId ? Number(form.clientId) : null };
      if (editProject) {
        await api.updateProject(editProject.id, body);
      } else {
        await api.createProject(body);
      }
      closeModal();
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> New Project</Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-brand-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <FolderKanban size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No projects yet. Create your first project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => {
              const client = clients.find(c => c.id === p.clientId);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-brand-100 transition-all cursor-pointer group"
                  onClick={() => navigate(`/admin/projects/${p.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1">
                      <ProjectStatusBadge status={p.status} />
                      <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400">{client ? client.name : 'No client'}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editProject ? 'Edit Project' : 'New Project'}>
        <div className="space-y-4">
          <Field label="Project Name" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" /></Field>
          <Field label="Client">
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none">
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Project description..." /></Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editProject ? 'Save Changes' : 'Create Project'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Project" message={`Delete "${deleteTarget?.name}"? All tasks in this project will be removed.`} confirmLabel="Delete" danger />
    </AdminLayout>
  );
}