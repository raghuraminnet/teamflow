import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import { Search, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Article {
  id: number;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export default function TeamKBPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Article | null>(null);

  useEffect(() => {
    api.getArticles(search ? { q: search } : undefined).then((d: any) => {
      setArticles(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-1">SOPs, documentation, and how-tos</p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map(a => (
              <div key={a.id} onClick={() => setPreview(a)}
                className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-brand-100 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 pr-2">{a.title}</h3>
                  {a.category && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 flex-shrink-0">{a.category}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-3">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <Modal open={!!preview} onClose={() => setPreview(null)} title={preview.title} size="lg">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{preview.content}</ReactMarkdown>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}