import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { ProjectStatusBadge, Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { FolderKanban, ChevronRight } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_at: string;
}

export default function TeamProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProjects({ status: 'active' } as any).then((d: any) => {
      setProjects(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Active projects you can work on</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <FolderKanban size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No active projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} onClick={() => navigate(`/team/projects/${p.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-brand-100 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{p.name}</h3>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-400 mt-0.5 transition-colors" />
                </div>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>}
                <div className="mt-3"><ProjectStatusBadge status={p.status} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}