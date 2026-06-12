import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { PriorityBadge, Avatar, ProjectStatusBadge } from '@/components/Layout';
import { api } from '@/lib/api';
import { ArrowLeft, Plus } from 'lucide-react';
const COLUMNS = [
    { key: 'todo', label: 'To Do', bg: 'bg-gray-50' },
    { key: 'in_progress', label: 'In Progress', bg: 'bg-blue-50' },
    { key: 'review', label: 'Review', bg: 'bg-yellow-50' },
    { key: 'done', label: 'Done', bg: 'bg-green-50' },
    { key: 'blocked', label: 'Blocked', bg: 'bg-red-50' },
];
export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        projectId: '', title: '', description: '', assignedTo: '', priority: 'medium'
    });
    useEffect(() => {
        if (!id)
            return;
        Promise.all([
            api.getProject(Number(id)),
            api.getUsers(),
        ]).then(([projData, userData]) => {
            setProject(projData.data);
            setUsers(userData.data ?? []);
            setForm(f => ({ ...f, projectId: id }));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);
    const handleCreateTask = async () => {
        setSaving(true);
        try {
            const body = {
                projectId: Number(id),
                title: form.title,
                description: form.description,
                assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
                priority: form.priority,
            };
            const newTask = await api.createTask(body);
            setProject(p => p ? { ...p, tasks: [...p.tasks, newTask] } : p);
            setForm(f => ({ ...f, title: '', description: '', assignedTo: '', priority: 'medium' }));
            setModalOpen(false);
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const handleStatusChange = async (taskId, newStatus) => {
        await api.updateTask(taskId, { status: newStatus });
        setProject(p => p ? {
            ...p,
            tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
        } : p);
    };
    const tasksByStatus = (status) => project?.tasks.filter(t => t.status === status) ?? [];
    if (loading) {
        return (_jsx(AdminLayout, { children: _jsx("div", { className: "h-96 bg-white rounded-xl animate-pulse border border-gray-100" }) }));
    }
    if (!project) {
        return (_jsxs(AdminLayout, { children: [_jsx("p", { className: "text-gray-400", children: "Project not found" }), _jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/projects'), className: "mt-4", children: [_jsx(ArrowLeft, { size: 16 }), " Back to Projects"] })] }));
    }
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("button", { onClick: () => navigate('/admin/projects'), className: "flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2", children: [_jsx(ArrowLeft, { size: 14 }), " All Projects"] }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: project.name }), project.description && _jsx("p", { className: "text-gray-500 text-sm mt-1", children: project.description })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(ProjectStatusBadge, { status: project.status }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Plus, { size: 16 }), " Add Task"] })] })] }), _jsx("div", { className: "grid grid-cols-5 gap-4 items-start", children: COLUMNS.map(col => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3 px-1", children: [_jsx("span", { className: "text-sm font-semibold text-gray-700", children: col.label }), _jsx("span", { className: "text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full", children: tasksByStatus(col.key).length })] }), _jsxs("div", { className: `rounded-xl p-3 space-y-2 min-h-32 ${col.bg}`, children: [tasksByStatus(col.key).map(task => (_jsxs("div", { className: "bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all group", children: [_jsxs("div", { className: "flex items-start gap-2 mb-2", children: [_jsx(PriorityBadge, { priority: task.priority }), _jsx("p", { className: "font-medium text-sm text-gray-900 flex-1", children: task.title })] }), task.description && (_jsx("p", { className: "text-xs text-gray-500 mb-2 line-clamp-2", children: task.description })), _jsxs("div", { className: "flex items-center justify-between", children: [task.assigneeName && (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Avatar, { name: task.assigneeName, size: "sm" }), _jsx("span", { className: "text-xs text-gray-400", children: task.assigneeName })] })), _jsx("select", { value: task.status, onChange: e => handleStatusChange(task.id, e.target.value), className: "text-xs px-2 py-1 rounded border border-gray-200 bg-white outline-none cursor-pointer ml-auto", children: COLUMNS.map(c => _jsx("option", { value: c.key, children: c.label }, c.key)) })] })] }, task.id))), tasksByStatus(col.key).length === 0 && (_jsx("div", { className: "h-20 flex items-center justify-center", children: _jsx("p", { className: "text-xs text-gray-300", children: "Drop here" }) }))] })] }, col.key))) })] }), _jsx(Modal, { open: modalOpen, onClose: () => setModalOpen(false), title: "Add Task", size: "md", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Title", required: true, children: _jsx(Input, { value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })), placeholder: "Task title" }) }), _jsx(Field, { label: "Description", children: _jsx(Textarea, { value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })), rows: 3, placeholder: "Task description..." }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Field, { label: "Assign to", children: _jsxs("select", { value: form.assignedTo, onChange: e => setForm(f => ({ ...f, assignedTo: e.target.value })), className: "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none", children: [_jsx("option", { value: "", children: "Unassigned" }), users.map(u => _jsx("option", { value: u.id, children: u.name }, u.id))] }) }), _jsx(Field, { label: "Priority", children: _jsxs("select", { value: form.priority, onChange: e => setForm(f => ({ ...f, priority: e.target.value })), className: "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none", children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" }), _jsx("option", { value: "urgent", children: "Urgent" })] }) })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setModalOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleCreateTask, loading: saving, children: "Create Task" })] })] }) })] }));
}
