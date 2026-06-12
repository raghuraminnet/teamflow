import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Badge } from '@/components/Layout';
import { Button } from '@/components/FormFields';
import { api } from '@/lib/api';
import { Play, Plus, Zap, Clock, GitBranch } from 'lucide-react';
const TRIGGER_LABELS = {
    manual: 'Manual',
    scheduled: 'Scheduled',
    event: 'Event',
};
const STEP_TYPE_ICONS = {
    create_task: _jsx(Plus, { size: 12 }),
    notify: _jsx(Zap, { size: 12 }),
    delay: _jsx(Clock, { size: 12 }),
    webhook: _jsx(GitBranch, { size: 12 }),
    condition: _jsx(GitBranch, { size: 12 }),
};
const STEP_TYPE_LABELS = {
    create_task: 'Create Task',
    notify: 'Send Notification',
    delay: 'Delay',
    webhook: 'Webhook',
    condition: 'Condition',
};
export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(null);
    useEffect(() => {
        api.getWorkflows().then((d) => { setWorkflows(d.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    const handleRun = async (id) => {
        setRunning(id);
        try {
            await api.runWorkflow(id, {});
            alert('Workflow triggered successfully!');
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setRunning(null);
        }
    };
    const triggerColors = {
        manual: 'bg-gray-100 text-gray-600',
        scheduled: 'bg-blue-100 text-blue-600',
        event: 'bg-purple-100 text-purple-600',
    };
    return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Workflows" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "Automate tasks with visual flow templates" })] }), loading ? (_jsx("div", { className: "grid gap-4", children: [1, 2, 3].map(i => _jsx("div", { className: "h-24 bg-white rounded-xl animate-pulse border border-gray-100" }, i)) })) : workflows.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-12 text-center", children: [_jsx(Zap, { size: 32, className: "mx-auto text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-400 mb-3", children: "No workflows yet" }), _jsx("p", { className: "text-sm text-gray-400", children: "Workflows let you automate repetitive tasks \u2014 create tasks on schedule, notify team members, or trigger actions based on events." })] })) : (_jsx("div", { className: "space-y-4", children: workflows.map(wf => (_jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-6 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: wf.name }), wf.description && _jsx("p", { className: "text-sm text-gray-500 mt-0.5", children: wf.description })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { className: triggerColors[wf.trigger_type] ?? 'bg-gray-100 text-gray-600', children: TRIGGER_LABELS[wf.trigger_type] ?? wf.trigger_type }), _jsxs(Button, { size: "sm", variant: "secondary", onClick: () => handleRun(wf.id), loading: running === wf.id, children: [_jsx(Play, { size: 13 }), " Run"] })] })] }), wf.steps_json?.length > 0 && (_jsx("div", { className: "flex items-center gap-2 flex-wrap", children: wf.steps_json.map((step, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 border border-gray-100", children: [_jsx("span", { className: "text-gray-400", children: STEP_TYPE_ICONS[step.type] ?? _jsx(GitBranch, { size: 12 }) }), STEP_TYPE_LABELS[step.type] ?? step.type] }), i < wf.steps_json.length - 1 && _jsx("div", { className: "w-4 h-px bg-gray-200" })] }, step.id))) })), (!wf.steps_json || wf.steps_json.length === 0) && (_jsx("p", { className: "text-sm text-gray-400", children: "No steps configured" }))] }, wf.id))) }))] }) }));
}
