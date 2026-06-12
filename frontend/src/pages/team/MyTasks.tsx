import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { StatusBadge, PriorityBadge, Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckSquare, Filter } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: number;
  assigneeName?: string;
  creatorName?: string;
  dueDate?: string;
  createdAt: string;
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'text-gray-500' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
  { key: 'review', label: 'Review', color: 'text-yellow-600' },
  { key: 'done', label: 'Done', color: 'text-green-600' },
  { key: 'blocked', label: 'Blocked', color: 'text-red-600' },
];

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getTasks(user ? { assignedTo: user.id } : undefined).then((d: any) => {
      setTasks(d.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await api.updateTask(taskId, { status: newStatus });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filtered = filter ? tasks.filter(t => t.status === filter) : tasks;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filter ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>All</button>
          {COLUMNS.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === c.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <CheckSquare size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {filter ? `No ${COLUMNS.find(c => c.key === filter)?.label} tasks` : 'No tasks assigned to you yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{t.title}</p>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  {t.description && <p className="text-sm text-gray-500 line-clamp-1">{t.description}</p>}
                  {t.dueDate && <p className="text-xs text-gray-400 mt-1">Due {new Date(t.dueDate).toLocaleDateString()}</p>}
                </div>
                <select
                  value={t.status}
                  onChange={e => handleStatusChange(t.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white outline-none text-gray-700 cursor-pointer"
                >
                  {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}