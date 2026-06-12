import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { ProjectStatusBadge } from '@/components/Layout';
import { api } from '@/lib/api';
import { FolderKanban, ChevronRight } from 'lucide-react';
export default function TeamProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        api.getProjects({ status: 'active' }).then((d) => {
            setProjects(d.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);
    return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Projects" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "Active projects you can work on" })] }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [1, 2, 3].map(i => _jsx("div", { className: "h-32 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : projects.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(FolderKanban, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400", children: "No active projects" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: projects.map(p => (_jsxs("div", { onClick: () => navigate(`/team/projects/${p.id}`), className: "bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-brand-100 transition-all group", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("h3", { className: "font-semibold text-gray-900 group-hover:text-brand-600 transition-colors", children: p.name }), _jsx(ChevronRight, { size: 14, className: "text-gray-300 group-hover:text-brand-400 mt-0.5 transition-colors" })] }), p.description && _jsx("p", { className: "text-sm text-gray-500 line-clamp-2", children: p.description }), _jsx("div", { className: "mt-3", children: _jsx(ProjectStatusBadge, { status: p.status }) })] }, p.id))) }))] }) }));
}
