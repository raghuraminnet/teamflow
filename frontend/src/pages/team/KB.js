import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import { Search, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
export default function TeamKBPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState(null);
    useEffect(() => {
        api.getArticles(search ? { q: search } : undefined).then((d) => {
            setArticles(d.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [search]);
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Knowledge Base" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "SOPs, documentation, and how-tos" })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search articles...", className: "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" })] }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [1, 2, 3, 4].map(i => _jsx("div", { className: "h-32 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : articles.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(BookOpen, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400", children: "No articles found" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: articles.map(a => (_jsxs("div", { onClick: () => setPreview(a), className: "bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-brand-100 transition-all", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("h3", { className: "font-semibold text-gray-900 pr-2", children: a.title }), a.category && (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 flex-shrink-0", children: a.category }))] }), _jsx("p", { className: "text-sm text-gray-500 line-clamp-3", children: a.content })] }, a.id))) }))] }), preview && (_jsx(Modal, { open: !!preview, onClose: () => setPreview(null), title: preview.title, size: "lg", children: _jsx("div", { className: "prose prose-sm max-w-none text-gray-700", children: _jsx(ReactMarkdown, { children: preview.content }) }) }))] }));
}
