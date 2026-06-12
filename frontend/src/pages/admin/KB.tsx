import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { Button, Field, Input, Textarea, Select } from '@/components/FormFields';
import { api } from '@/lib/api';
import { Plus, Search, BookOpen, Edit2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Article {
  id: number;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export default function KBAdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<Article | null>(null);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: '' });

  const load = () => {
    api.getArticles(search ? { q: search } : undefined).then((d: any) => {
      setArticles(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditArticle(null); setForm({ title: '', content: '', category: '' }); setModalOpen(true); };
  const openEdit = (a: Article) => { setEditArticle(a); setForm({ title: a.title, content: a.content, category: a.category ?? '' }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editArticle) {
        await api.updateArticle(editArticle.id, form);
      } else {
        await api.createArticle(form);
      }
      closeModal();
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this article?')) return;
    await api.deleteArticle(id);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="text-gray-500 text-sm mt-1">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> New Article</Button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No articles yet. Create SOPs and documentation for your team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      {a.category && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">{a.category}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{a.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreview(a)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <BookOpen size={14} />
                    </button>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <Modal open={!!preview} onClose={() => setPreview(null)} title={preview.title} size="lg">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{preview.content}</ReactMarkdown>
          </div>
        </Modal>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editArticle ? 'Edit Article' : 'New Article'} size="lg">
        <div className="space-y-4">
          <Field label="Title" required><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title" /></Field>
          <Field label="Category"><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. SOP, Onboarding, FAQ" /></Field>
          <Field label="Content" required>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={12} placeholder="Write in Markdown... Use **bold**, ## headings, - lists, etc." />
            <p className="text-xs text-gray-400 mt-1">Supports Markdown formatting</p>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editArticle ? 'Save Changes' : 'Create Article'}</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}