import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editClient, setEditClient] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
    const loadClients = () => {
        api.getClients(search ? { search } : undefined).then((d) => {
            setClients(d.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { loadClients(); }, [search]);
    const openCreate = () => { setEditClient(null); setForm({ name: '', email: '', phone: '', company: '', notes: '' }); setModalOpen(true); };
    const openEdit = (c) => { setEditClient(c); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', company: c.company ?? '', notes: c.notes ?? '' }); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);
    const handleSave = async () => {
        setSaving(true);
        try {
            if (editClient) {
                await api.updateClient(editClient.id, form);
            }
            else {
                await api.createClient(form);
            }
            closeModal();
            loadClients();
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
        await api.deleteClient(deleteTarget.id);
        setDeleteTarget(null);
        loadClients();
    };
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Clients" }), _jsxs("p", { className: "text-gray-500 text-sm mt-1", children: [clients.length, " client", clients.length !== 1 ? 's' : ''] })] }), _jsxs(Button, { onClick: openCreate, children: [_jsx(Plus, { size: 16 }), " Add Client"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search clients...", className: "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" })] }), loading ? (_jsx("div", { className: "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden", children: [1, 2, 3, 4, 5].map(i => (_jsxs("div", { className: "px-6 py-4 flex gap-4 border-b border-gray-50", children: [_jsx("div", { className: "h-4 bg-gray-100 rounded animate-pulse flex-1" }), _jsx("div", { className: "h-4 bg-gray-100 rounded animate-pulse w-32" }), _jsx("div", { className: "h-4 bg-gray-100 rounded animate-pulse w-40" })] }, i))) })) : clients.length === 0 ? (_jsx("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: _jsx("p", { className: "text-gray-400", children: "No clients yet. Add your first client to get started." }) })) : (_jsx("div", { className: "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-50 border-b border-gray-100", children: [_jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Client" }), _jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Company" }), _jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Contact" }), _jsx("th", { className: "px-6 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-50", children: clients.map(c => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: c.name, size: "md" }), _jsx("span", { className: "font-medium text-gray-900", children: c.name })] }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: c.company ?? '—' }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: c.email ?? c.phone ?? '—' }), _jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx("button", { onClick: () => openEdit(c), className: "p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600", children: _jsx(Edit2, { size: 15 }) }), _jsx("button", { onClick: () => setDeleteTarget(c), className: "p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500", children: _jsx(Trash2, { size: 15 }) })] }) })] }, c.id))) })] }) }))] }), _jsx(Modal, { open: modalOpen, onClose: closeModal, title: editClient ? 'Edit Client' : 'Add Client', children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Name", required: true, children: _jsx(Input, { value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "Client name" }) }), _jsx(Field, { label: "Company", children: _jsx(Input, { value: form.company, onChange: e => setForm(f => ({ ...f, company: e.target.value })), placeholder: "Company name" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Field, { label: "Email", children: _jsx(Input, { type: "email", value: form.email, onChange: e => setForm(f => ({ ...f, email: e.target.value })), placeholder: "client@email.com" }) }), _jsx(Field, { label: "Phone", children: _jsx(Input, { value: form.phone, onChange: e => setForm(f => ({ ...f, phone: e.target.value })), placeholder: "+60..." }) })] }), _jsx(Field, { label: "Notes", children: _jsx(Textarea, { value: form.notes, onChange: e => setForm(f => ({ ...f, notes: e.target.value })), placeholder: "Internal notes...", rows: 2 }) }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }), _jsx(Button, { onClick: handleSave, loading: saving, children: editClient ? 'Save Changes' : 'Add Client' })] })] }) }), _jsx(ConfirmModal, { open: !!deleteTarget, onClose: () => setDeleteTarget(null), onConfirm: handleDelete, title: "Delete Client", message: `Delete "${deleteTarget?.name}"? All associated projects and tasks will be removed.`, confirmLabel: "Delete", danger: true })] }));
}
