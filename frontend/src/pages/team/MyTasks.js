import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { PriorityBadge } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckSquare, Filter } from 'lucide-react';
const COLUMNS = [
    { key: 'todo', label: 'To Do', color: 'text-gray-500' },
    { key: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
    { key: 'review', label: 'Review', color: 'text-yellow-600' },
    { key: 'done', label: 'Done', color: 'text-green-600' },
    { key: 'blocked', label: 'Blocked', color: 'text-red-600' },
];
export default function MyTasksPage() {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    useEffect(() => {
        api.getTasks(user ? { assignedTo: user.id } : undefined).then((d) => {
            setTasks(d.data ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [user]);
    const handleStatusChange = async (taskId, newStatus) => {
        await api.updateTask(taskId, { status: newStatus });
        setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };
    const filtered = filter ? tasks.filter(t => t.status === filter) : tasks;
    return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "My Tasks" }), _jsxs("p", { className: "text-gray-500 text-sm mt-1", children: [tasks.length, " task", tasks.length !== 1 ? 's' : '', " assigned to you"] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Filter, { size: 14, className: "text-gray-400" }), _jsx("button", { onClick: () => setFilter(''), className: `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filter ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`, children: "All" }), COLUMNS.map(c => (_jsx("button", { onClick: () => setFilter(c.key), className: `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === c.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`, children: c.label }, c.key)))] }), loading ? (_jsx("div", { className: "space-y-3", children: [1, 2, 3].map(i => _jsx("div", { className: "h-20 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : filtered.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(CheckSquare, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400", children: filter ? `No ${COLUMNS.find(c => c.key === filter)?.label} tasks` : 'No tasks assigned to you yet' })] })) : (_jsx("div", { className: "space-y-2", children: filtered.map(t => (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("p", { className: "font-medium text-gray-900 truncate", children: t.title }), _jsx(PriorityBadge, { priority: t.priority })] }), t.description && _jsx("p", { className: "text-sm text-gray-500 line-clamp-1", children: t.description }), t.dueDate && _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: ["Due ", new Date(t.dueDate).toLocaleDateString()] })] }), _jsx("select", { value: t.status, onChange: e => handleStatusChange(t.id, e.target.value), className: "px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white outline-none text-gray-700 cursor-pointer", children: COLUMNS.map(c => _jsx("option", { value: c.key, children: c.label }, c.key)) })] }, t.id))) }))] }) }));
}
