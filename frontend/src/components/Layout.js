import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
const STATUS_COLORS = {
    todo: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
};
const PRIORITY_COLORS = {
    low: 'bg-gray-100 text-gray-500',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
};
const TASK_STATUS_LABELS = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
};
const PROJECT_STATUS_LABELS = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
};
export function Badge({ children, className }) {
    return (_jsx("span", { className: clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className), children: children }));
}
export function StatusBadge({ status }) {
    return (_jsx(Badge, { className: STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600', children: TASK_STATUS_LABELS[status] ?? status }));
}
export function PriorityBadge({ priority }) {
    return (_jsx(Badge, { className: PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-600', children: priority.charAt(0).toUpperCase() + priority.slice(1) }));
}
export function ProjectStatusBadge({ status }) {
    const COLORS = {
        active: 'bg-green-100 text-green-700',
        paused: 'bg-yellow-100 text-yellow-700',
        completed: 'bg-blue-100 text-blue-700',
        archived: 'bg-gray-100 text-gray-500',
    };
    return (_jsx(Badge, { className: COLORS[status] ?? 'bg-gray-100 text-gray-600', children: PROJECT_STATUS_LABELS[status] ?? status }));
}
export function Avatar({ name, size = 'md' }) {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-brand-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
    const idx = name.charCodeAt(0) % colors.length;
    const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
    return (_jsx("span", { className: clsx('inline-flex items-center justify-center rounded-full text-white font-medium', sizeClass, colors[idx]), children: initials }));
}
export function StatCard({ label, value, sub, color }) {
    return (_jsxs("div", { className: "bg-white rounded-xl p-5 shadow-sm border border-gray-100", children: [_jsx("div", { className: "text-sm text-gray-500 uppercase tracking-wide", children: label }), _jsx("div", { className: clsx('text-2xl font-bold mt-1', color ?? 'text-gray-900'), children: value }), sub && _jsx("div", { className: "text-xs text-gray-400 mt-1", children: sub })] }));
}
export function DataTableSkeleton({ rows = 5, cols = 4 }) {
    return (_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-100 flex gap-4", children: Array.from({ length: cols }).map((_, i) => (_jsx("div", { className: "h-4 bg-gray-100 rounded animate-pulse flex-1" }, i))) }), Array.from({ length: rows }).map((_, i) => (_jsx("div", { className: "px-6 py-4 flex gap-4 border-b border-gray-50", children: Array.from({ length: cols }).map((_, j) => (_jsx("div", { className: "h-4 bg-gray-50 rounded animate-pulse flex-1" }, j))) }, i)))] }));
}
