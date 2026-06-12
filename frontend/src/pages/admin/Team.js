import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button, Field, Input } from '@/components/FormFields';
import { Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Shield, User } from 'lucide-react';
export default function TeamPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'team_member' });
    const loadUsers = () => {
        api.getUsers().then((d) => { setUsers(d.data); setLoading(false); }).catch(() => setLoading(false));
    };
    useEffect(() => { loadUsers(); }, []);
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.createUser(form);
            closeModal();
            loadUsers();
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
        await api.deleteUser(deleteTarget.id);
        setDeleteTarget(null);
        loadUsers();
    };
    const closeModal = () => setModalOpen(false);
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Team Members" }), _jsxs("p", { className: "text-gray-500 text-sm mt-1", children: [users.length, " member", users.length !== 1 ? 's' : ''] })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Plus, { size: 16 }), " Invite Member"] })] }), _jsx("div", { className: "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-50 border-b border-gray-100", children: [_jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Member" }), _jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Role" }), _jsx("th", { className: "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Joined" }), _jsx("th", { className: "px-6 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-50", children: users.map(u => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: u.name }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: u.name }), _jsx("div", { className: "text-sm text-gray-400", children: u.email })] })] }) }), _jsx("td", { className: "px-6 py-4", children: _jsxs("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`, children: [u.role === 'admin' ? _jsx(Shield, { size: 12 }) : _jsx(User, { size: 12 }), u.role === 'admin' ? 'Admin' : 'Team Member'] }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-400", children: new Date(u.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4 text-right", children: _jsx("button", { onClick: () => setDeleteTarget(u), className: "p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500", children: "Remove" }) })] }, u.id))) })] }) })] }), _jsx(Modal, { open: modalOpen, onClose: closeModal, title: "Invite Team Member", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Full Name", required: true, children: _jsx(Input, { value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "John Doe" }) }), _jsx(Field, { label: "Email", required: true, children: _jsx(Input, { type: "email", value: form.email, onChange: e => setForm(f => ({ ...f, email: e.target.value })), placeholder: "john@company.com" }) }), _jsx(Field, { label: "Password", required: true, children: _jsx(Input, { type: "password", value: form.password, onChange: e => setForm(f => ({ ...f, password: e.target.value })), placeholder: "Min 6 characters" }) }), _jsx(Field, { label: "Role", children: _jsxs("select", { value: form.role, onChange: e => setForm(f => ({ ...f, role: e.target.value })), className: "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none", children: [_jsx("option", { value: "team_member", children: "Team Member" }), _jsx("option", { value: "admin", children: "Admin" })] }) }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }), _jsx(Button, { onClick: handleSave, loading: saving, children: "Send Invite" })] })] }) }), _jsx(ConfirmModal, { open: !!deleteTarget, onClose: () => setDeleteTarget(null), onConfirm: handleDelete, title: "Remove Member", message: `Remove "${deleteTarget?.name}" from the team?`, confirmLabel: "Remove", danger: true })] }));
}
