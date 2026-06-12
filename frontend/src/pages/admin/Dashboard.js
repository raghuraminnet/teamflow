import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { StatCard } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowUpRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
const ACTION_LABELS = {
    created: 'created',
    updated: 'updated',
    status_changed: 'changed status',
    assigned: 'was assigned',
    commented: 'commented on',
    project_created: 'created project',
    task_created: 'created task',
    workflow_triggered: 'triggered workflow',
};
export default function AdminDashboard() {
    const { accessToken } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.getStats().then((data) => {
            setStats(data.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);
    if (loading) {
        return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "h-8 w-48 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "grid grid-cols-4 gap-4", children: [1, 2, 3, 4].map(i => _jsx("div", { className: "h-24 bg-white rounded-xl animate-pulse" }, i)) })] }) }));
    }
    const tasksByStatus = Object.fromEntries((stats?.tasksByStatus ?? []).map(s => [s.status, s.count]));
    return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "Overview of your workspace" })] }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatCard, { label: "Active Projects", value: stats?.projects.active ?? 0, sub: `${stats?.projects.total ?? 0} total`, color: "text-brand-600" }), _jsx(StatCard, { label: "Open Tasks", value: stats?.tasks.open ?? 0, sub: `${stats?.tasks.total ?? 0} total`, color: "text-orange-600" }), _jsx(StatCard, { label: "Clients", value: stats?.clients.total ?? 0, color: "text-gray-900" }), _jsx(StatCard, { label: "Team Members", value: stats?.users.total ?? 0, color: "text-gray-900" })] }), _jsxs("div", { className: "bg-white rounded-xl p-6 border border-gray-100 shadow-sm", children: [_jsx("h2", { className: "text-base font-semibold text-gray-800 mb-4", children: "Tasks by Status" }), _jsx("div", { className: "grid grid-cols-5 gap-3", children: [
                                { key: 'todo', label: 'To Do', icon: _jsx(Clock, { size: 16 }), color: 'text-gray-500 bg-gray-50' },
                                { key: 'in_progress', label: 'In Progress', icon: _jsx(ArrowUpRight, { size: 16 }), color: 'text-blue-600 bg-blue-50' },
                                { key: 'review', label: 'Review', icon: _jsx(AlertTriangle, { size: 16 }), color: 'text-yellow-600 bg-yellow-50' },
                                { key: 'done', label: 'Done', icon: _jsx(CheckCircle2, { size: 16 }), color: 'text-green-600 bg-green-50' },
                                { key: 'blocked', label: 'Blocked', icon: _jsx(AlertTriangle, { size: 16 }), color: 'text-red-600 bg-red-50' },
                            ].map(s => (_jsxs("div", { className: "bg-gray-50 rounded-xl p-4 text-center", children: [_jsxs("div", { className: clsx('inline-flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-full', s.color), children: [s.icon, " ", s.label] }), _jsx("div", { className: "text-2xl font-bold text-gray-900", children: tasksByStatus[s.key] ?? 0 })] }, s.key))) })] }), _jsxs("div", { className: "bg-white rounded-xl border border-gray-100 shadow-sm", children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-100", children: _jsx("h2", { className: "text-base font-semibold text-gray-800", children: "Recent Activity" }) }), stats?.recentActivity && stats.recentActivity.length > 0 ? (_jsx("div", { className: "divide-y divide-gray-50", children: stats.recentActivity.slice(0, 15).map((a) => (_jsxs("div", { className: "px-6 py-4 flex items-start gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-brand-300 mt-1.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm text-gray-700", children: [_jsx("span", { className: "font-medium text-gray-900", children: a.userName ?? 'System' }), ' ', ACTION_LABELS[a.action] ?? a.action, a.taskId && ' a task', a.projectId && ' in a project'] }), _jsx("p", { className: "text-xs text-gray-400 mt-0.5", children: timeAgo(a.created_at) })] })] }, a.id))) })) : (_jsx("div", { className: "px-6 py-12 text-center text-gray-400 text-sm", children: "No recent activity" }))] })] }) }));
}
