import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { api } from '@/lib/api';
import { Plus, Search, BookOpen, Edit2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
export default function KBAdminPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [preview, setPreview] = useState(null);
    const [editArticle, setEditArticle] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', category: '' });
    const load = () => {
        api.getArticles(search ? { q: search } : undefined).then((d) => {
            setArticles(d.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, [search]);
    const openCreate = () => { setEditArticle(null); setForm({ title: '', content: '', category: '' }); setModalOpen(true); };
    const openEdit = (a) => { setEditArticle(a); setForm({ title: a.title, content: a.content, category: a.category ?? '' }); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);
    const handleSave = async () => {
        setSaving(true);
        try {
            if (editArticle) {
                await api.updateArticle(editArticle.id, form);
            }
            else {
                await api.createArticle(form);
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
    const handleDelete = async (id) => {
        if (!confirm('Delete this article?'))
            return;
        await api.deleteArticle(id);
        load();
    };
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Knowledge Base" }), _jsxs("p", { className: "text-gray-500 text-sm mt-1", children: [articles.length, " article", articles.length !== 1 ? 's' : ''] })] }), _jsxs(Button, { onClick: openCreate, children: [_jsx(Plus, { size: 16 }), " New Article"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search articles...", className: "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" })] }), loading ? (_jsx("div", { className: "grid gap-3", children: [1, 2, 3, 4].map(i => _jsx("div", { className: "h-20 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : articles.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(BookOpen, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400", children: "No articles yet. Create SOPs and documentation for your team." })] })) : (_jsx("div", { className: "space-y-3", children: articles.map(a => (_jsx("div", { className: "bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-all group", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: a.title }), a.category && (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500", children: a.category }))] }), _jsx("p", { className: "text-sm text-gray-500 line-clamp-2", children: a.content })] }), _jsxs("div", { className: "flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => setPreview(a), className: "p-1.5 rounded-lg hover:bg-gray-100 text-gray-400", children: _jsx(BookOpen, { size: 14 }) }), _jsx("button", { onClick: () => openEdit(a), className: "p-1.5 rounded-lg hover:bg-gray-100 text-gray-400", children: _jsx(Edit2, { size: 14 }) }), _jsx("button", { onClick: () => handleDelete(a.id), className: "p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500", children: _jsx(Trash2, { size: 14 }) })] })] }) }, a.id))) }))] }), preview && (_jsx(Modal, { open: !!preview, onClose: () => setPreview(null), title: preview.title, size: "lg", children: _jsx("div", { className: "prose prose-sm max-w-none text-gray-700", children: _jsx(ReactMarkdown, { children: preview.content }) }) })), _jsx(Modal, { open: modalOpen, onClose: closeModal, title: editArticle ? 'Edit Article' : 'New Article', size: "lg", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Title", required: true, children: _jsx(Input, { value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })), placeholder: "Article title" }) }), _jsx(Field, { label: "Category", children: _jsx(Input, { value: form.category, onChange: e => setForm(f => ({ ...f, category: e.target.value })), placeholder: "e.g. SOP, Onboarding, FAQ" }) }), _jsxs(Field, { label: "Content", required: true, children: [_jsx(Textarea, { value: form.content, onChange: e => setForm(f => ({ ...f, content: e.target.value })), rows: 12, placeholder: "Write in Markdown... Use **bold**, ## headings, - lists, etc." }), _jsx("p", { className: "text-xs text-gray-400 mt-1", children: "Supports Markdown formatting" })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }), _jsx(Button, { onClick: handleSave, loading: saving, children: editArticle ? 'Save Changes' : 'Create Article' })] })] }) })] }));
}
