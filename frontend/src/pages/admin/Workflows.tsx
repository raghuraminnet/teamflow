import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { Badge } from '@/components/Layout';
import { Button } from '@/components/FormFields';
import { api } from '@/lib/api';
import {
  Play,
  Plus,
  Zap,
  Clock,
  GitBranch,
  Settings,
} from 'lucide-react';

interface Workflow {
  id: number;
  name: string;
  description?: string;
  trigger_type: string;
  is_active: boolean;
  steps_json: any[];
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  scheduled: 'Scheduled',
  event: 'Event',
};

const STEP_TYPE_ICONS: Record<string, React.ReactNode> = {
  create_task: <Plus size={12} />,
  notify: <Zap size={12} />,
  delay: <Clock size={12} />,
  webhook: <GitBranch size={12} />,
  condition: <GitBranch size={12} />,
};

const STEP_TYPE_LABELS: Record<string, string> = {
  create_task: 'Create Task',
  notify: 'Send Notification',
  delay: 'Delay',
  webhook: 'Webhook',
  condition: 'Condition',
};

const triggerColors: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-600',
  event: 'bg-purple-100 text-purple-600',
};

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<number | null>(null);

  useEffect(() => {
    api.getWorkflows()
      .then((d: any) => {
        setWorkflows(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRun = async (id: number) => {
    setRunning(id);
    try {
      await api.runWorkflow(id, {});
      alert('Workflow triggered successfully!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-1">
            Automate tasks with visual flow templates
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-xl animate-pulse border border-gray-100"
              />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Zap size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 mb-3">No workflows yet</p>
            <p className="text-sm text-gray-400">
              Workflows let you automate repetitive tasks — create tasks on schedule, notify team
              members, or trigger actions based on events.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                    {wf.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{wf.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        triggerColors[wf.trigger_type] ?? 'bg-gray-100 text-gray-600'
                      }
                    >
                      {TRIGGER_LABELS[wf.trigger_type] ?? wf.trigger_type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/admin/workflows/build/${wf.id}`)}
                    >
                      <Settings size={13} /> Build
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRun(wf.id)}
                      loading={running === wf.id}
                    >
                      <Play size={13} /> Run
                    </Button>
                  </div>
                </div>

                {/* Steps visual */}
                {wf.steps_json && wf.steps_json.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps_json.map((step: any, i: number) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 border border-gray-100">
                          <span className="text-gray-400">
                            {STEP_TYPE_ICONS[step.type] ?? <GitBranch size={12} />}
                          </span>
                          {STEP_TYPE_LABELS[step.type] ?? step.type}
                        </div>
                        {i < wf.steps_json.length - 1 && <div className="w-4 h-px bg-gray-200" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No steps configured</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}