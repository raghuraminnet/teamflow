import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '@/lib/store';
import { Avatar } from '@/components/Layout';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, Workflow, BookOpen, LogOut, ChevronRight, Layers } from 'lucide-react';
const ADMIN_NAV = [
    { label: 'Dashboard', to: '/admin', icon: _jsx(LayoutDashboard, { size: 18 }) },
    { label: 'Clients', to: '/admin/clients', icon: _jsx(Users, { size: 18 }) },
    { label: 'Projects', to: '/admin/projects', icon: _jsx(FolderKanban, { size: 18 }) },
    { label: 'Team', to: '/admin/team', icon: _jsx(Layers, { size: 18 }) },
    { label: 'Workflows', to: '/admin/workflows', icon: _jsx(Workflow, { size: 18 }) },
    { label: 'Knowledge Base', to: '/admin/kb', icon: _jsx(BookOpen, { size: 18 }) },
];
const TEAM_NAV = [
    { label: 'My Tasks', to: '/team', icon: _jsx(CheckSquare, { size: 18 }) },
    { label: 'Projects', to: '/team/projects', icon: _jsx(FolderKanban, { size: 18 }) },
    { label: 'Knowledge Base', to: '/team/kb', icon: _jsx(BookOpen, { size: 18 }) },
];
export function Sidebar() {
    const { user, clearAuth } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';
    const navItems = isAdmin ? ADMIN_NAV : TEAM_NAV;
    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };
    return (_jsxs("aside", { className: "w-56 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0", children: [_jsx("div", { className: "px-5 py-4 border-b border-gray-100", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center", children: _jsx(CheckSquare, { size: 15, className: "text-white" }) }), _jsx("span", { className: "font-bold text-gray-900 text-lg tracking-tight", children: "TeamFlow" })] }) }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-0.5 overflow-y-auto", children: navItems.map(item => {
                    const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    return (_jsxs(Link, { to: item.to, className: clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', active
                            ? 'bg-brand-50 text-brand-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'), children: [_jsx("span", { className: active ? 'text-brand-500' : 'text-gray-400', children: item.icon }), item.label, active && _jsx(ChevronRight, { size: 14, className: "ml-auto text-brand-400" })] }, item.to));
                }) }), _jsxs("div", { className: "p-3 border-t border-gray-100 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2.5 px-3 py-2 rounded-lg", children: [_jsx(Avatar, { name: user?.name ?? 'U', size: "sm" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: user?.name }), _jsx("div", { className: "text-xs text-gray-400 capitalize", children: user?.role?.replace('_', ' ') })] })] }), _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors", children: [_jsx(LogOut, { size: 16 }), "Sign out"] })] })] }));
}
export function PageShell({ children }) {
    return (_jsx("div", { className: "ml-56 min-h-screen", children: _jsx("div", { className: "max-w-6xl mx-auto px-8 py-8", children: children }) }));
}
export function AdminLayout({ children }) {
    return (_jsxs("div", { className: "flex min-h-screen bg-gray-50", children: [_jsx(Sidebar, {}), _jsx("div", { className: "ml-56 flex-1", children: _jsx("div", { className: "max-w-6xl mx-auto px-8 py-8", children: children }) })] }));
}
