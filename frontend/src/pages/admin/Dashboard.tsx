import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { StatCard } from '@/components/Layout';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, CheckCircle2, Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

interface Stats {
  projects: { total: number; active: number };
  tasks: { total: number; open: number; done: number; overdue: number };
  clients: { total: number };
  users: { total: number };
  tasksByStatus: { status: string; count: number }[];
  recentActivity: any[];
  velocityData: { day: string; done: number; created: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#3b82f6',
  review: '#eab308',
  done: '#22c55e',
  blocked: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  status_changed: 'changed status',
  assigned: 'was assigned',
  commented: 'commented',
  project_created: 'created project',
  task_created: 'created task',
  workflow_triggered: 'triggered workflow',
};

const PIE_COLORS = ['#9ca3af', '#3b82f6', '#eab308', '#22c55e', '#ef4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getTasks({} as any),
    ]).then(([statsData, allTasks]: any[]) => {
      const s = statsData.data;
      const tasks = allTasks.data ?? [];

      const tasksByStatus = [
        { status: 'todo', count: tasks.filter((t: any) => t.status === 'todo').length },
        { status: 'in_progress', count: tasks.filter((t: any) => t.status === 'in_progress').length },
        { status: 'review', count: tasks.filter((t: any) => t.status === 'review').length },
        { status: 'done', count: tasks.filter((t: any) => t.status === 'done').length },
        { status: 'blocked', count: tasks.filter((t: any) => t.status === 'blocked').length },
      ];

      const now = new Date();
      const overdue = tasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
      ).length;

      setStats({
        ...s,
        tasks: { ...s.tasks, done: tasksByStatus.find(t => t.status === 'done')?.count ?? 0, overdue },
        tasksByStatus,
        velocityData: s.velocityData ?? [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const tasksByStatus = Object.fromEntries((stats?.tasksByStatus ?? []).map((s: any) => [s.status, s.count]));
  const pieData = stats?.tasksByStatus.map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? '#9ca3af',
  })) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your workspace</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Active Projects" value={stats?.projects.active ?? 0} sub={`${stats?.projects.total ?? 0} total`} color="text-brand-600" />
          <StatCard label="Open Tasks" value={stats?.tasks.open ?? 0} sub={`${stats?.tasks.total ?? 0} total`} color="text-orange-600" />
          <StatCard label="Done" value={stats?.tasks.done ?? 0} color="text-green-600" />
          <StatCard label="Overdue" value={stats?.tasks.overdue ?? 0} color={stats?.tasks.overdue ? 'text-red-600' : 'text-gray-900'} />
          <StatCard label="Clients" value={stats?.clients.total ?? 0} color="text-gray-900" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Status Pie */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Task Distribution</h2>
            {pieData.some(d => d.value > 0) ? (
              <div className="flex items-center gap-4">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={3}>
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="space-y-2 flex-1">
                  {pieData.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-gray-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No tasks yet</p>
            )}
          </div>

          {/* Kanban status bars */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Tasks by Stage</h2>
            <div className="space-y-3">
              {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(key => {
                const count = tasksByStatus[key] ?? 0;
                const total = Object.values(tasksByStatus).reduce((a: number, b: number) => a + b, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                        {STATUS_LABELS[key]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[key] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Recent Activity</h2>
          </div>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {stats.recentActivity.slice(0, 20).map((a: any) => (
                <div key={a.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-brand-300 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{a.userName ?? 'System'}</span>
                      {' '}{ACTION_LABELS[a.action] ?? a.action}
                      {a.taskId && <span className="text-gray-500"> a task</span>}
                      {a.projectId && <span className="text-gray-500"> in a project</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.created_at ?? a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}