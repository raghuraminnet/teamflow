import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { ProjectStatusBadge } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Search, FolderKanban, Edit2, Trash2, ChevronRight } from 'lucide-react';
export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'active' });
    const load = () => {
        Promise.all([
            api.getProjects(statusFilter ? { status: statusFilter } : undefined),
            api.getClients(),
        ]).then(([projData, clientData]) => {
            let projs = projData.data;
            if (search)
                projs = projs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
            setProjects(projs);
            setClients(clientData.data ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, [statusFilter]);
    const openCreate = () => { setEditProject(null); setForm({ name: '', description: '', clientId: '', status: 'active' }); setModalOpen(true); };
    const openEdit = (p) => { setEditProject(p); setForm({ name: p.name, description: p.description ?? '', clientId: p.clientId?.toString() ?? '', status: p.status }); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);
    const handleSave = async () => {
        setSaving(true);
        try {
            const body = { ...form, clientId: form.clientId ? Number(form.clientId) : null };
            if (editProject) {
                await api.updateProject(editProject.id, body);
            }
            else {
                await api.createProject(body);
            }
            closeModal();
            load();
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!deleteTarget)
            return;
        await api.deleteProject(deleteTarget.id);
        setDeleteTarget(null);
        load();
    };
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Projects" }), _jsxs("p", { className: "text-gray-500 text-sm mt-1", children: [projects.length, " project", projects.length !== 1 ? 's' : ''] })] }), _jsxs(Button, { onClick: openCreate, children: [_jsx(Plus, { size: 16 }), " New Project"] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search projects...", className: "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" })] }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: "px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-brand-500", children: [_jsx("option", { value: "", children: "All Status" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "archived", children: "Archived" })] })] }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [1, 2, 3, 4, 5, 6].map(i => _jsx("div", { className: "h-40 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : projects.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(FolderKanban, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400", children: "No projects yet. Create your first project." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: projects.map(p => {
                            const client = clients.find(c => c.id === p.clientId);
                            return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-brand-100 transition-all cursor-pointer group", onClick: () => navigate(`/admin/projects/${p.id}`), children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("h3", { className: "font-semibold text-gray-900 group-hover:text-brand-600 transition-colors", children: p.name }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(ProjectStatusBadge, { status: p.status }), _jsx("button", { onClick: e => { e.stopPropagation(); openEdit(p); }, className: "p-1 rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(Edit2, { size: 14 }) }), _jsx("button", { onClick: e => { e.stopPropagation(); setDeleteTarget(p); }, className: "p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(Trash2, { size: 14 }) })] })] }), p.description && _jsx("p", { className: "text-sm text-gray-500 line-clamp-2 mb-3", children: p.description }), _jsxs("div", { className: "flex items-center justify-between mt-auto", children: [_jsx("span", { className: "text-xs text-gray-400", children: client ? client.name : 'No client' }), _jsx(ChevronRight, { size: 14, className: "text-gray-300 group-hover:text-brand-400 transition-colors" })] })] }, p.id));
                        }) }))] }), _jsx(Modal, { open: modalOpen, onClose: closeModal, title: editProject ? 'Edit Project' : 'New Project', children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Project Name", required: true, children: _jsx(Input, { value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "Project name" }) }), _jsx(Field, { label: "Client", children: _jsxs("select", { value: form.clientId, onChange: e => setForm(f => ({ ...f, clientId: e.target.value })), className: "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none", children: [_jsx("option", { value: "", children: "No client" }), clients.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] }) }), _jsx(Field, { label: "Description", children: _jsx(Textarea, { value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })), rows: 3, placeholder: "Project description..." }) }), _jsx(Field, { label: "Status", children: _jsxs("select", { value: form.status, onChange: e => setForm(f => ({ ...f, status: e.target.value })), className: "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none", children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "archived", children: "Archived" })] }) }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }), _jsx(Button, { onClick: handleSave, loading: saving, children: editProject ? 'Save Changes' : 'Create Project' })] })] }) }), _jsx(ConfirmModal, { open: !!deleteTarget, onClose: () => setDeleteTarget(null), onConfirm: handleDelete, title: "Delete Project", message: `Delete "${deleteTarget?.name}"? All tasks in this project will be removed.`, confirmLabel: "Delete", danger: true })] }));
}
