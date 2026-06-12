import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/layouts/AppLayout';
import { Button, Field, Input, Select, Textarea } from '@/components/FormFields';
import { Modal, ConfirmModal } from '@/components/Modal';
import { api } from '@/lib/api';
import {
  Plus, Trash2, GripVertical, Play, Save, Zap, Clock, GitBranch,
  ArrowRight, AlertCircle, X, Search
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepType = 'create_task' | 'delay' | 'webhook' | 'condition';

interface StepBase {
  id: string;
  type: StepType;
}

interface CreateTaskConfig {
  projectId?: number;
  title?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: number;
  description?: string;
}

interface DelayConfig {
  ms?: number;
}

interface WebhookConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT';
  body?: string;
}

interface ConditionConfig {
  expression?: string;
}

type Step = StepBase &
  (
    | { type: 'create_task'; config: CreateTaskConfig }
    | { type: 'delay'; config: DelayConfig }
    | { type: 'webhook'; config: WebhookConfig }
    | { type: 'condition'; config: ConditionConfig }
  );

interface Workflow {
  id: number;
  name: string;
  description?: string;
  trigger_type: string;
  is_active: boolean;
  steps_json: Step[];
  created_at: string;
}

interface NewWorkflowForm {
  name: string;
  description: string;
  trigger_type: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_TYPES: { value: StepType; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'create_task', label: 'Create Task', icon: <Plus size={14} />, hint: 'Creates a new task in a project' },
  { value: 'delay',       label: 'Delay',       icon: <Clock size={14} />,    hint: 'Pauses execution for a duration' },
  { value: 'webhook',     label: 'Webhook',     icon: <GitBranch size={14} />, hint: 'Sends an HTTP request' },
  { value: 'condition',   label: 'Condition',   icon: <AlertCircle size={14} />, hint: 'Evaluates a conditional expression' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const METHOD_OPTIONS = [
  { value: 'GET',  label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT',  label: 'PUT' },
];

// ─── Sortable Step Card ──────────────────────────────────────────────────────

function makeEmptyStep(type: StepType): Step {
  const id = crypto.randomUUID();
  switch (type) {
    case 'create_task': return { id, type: 'create_task', config: {} };
    case 'delay':       return { id, type: 'delay',       config: {} };
    case 'webhook':     return { id, type: 'webhook',     config: {} };
    case 'condition':   return { id, type: 'condition',   config: {} };
  }
}

interface SortableStepCardProps {
  step: Step;
  index: number;
  total: number;
  onUpdate: (updated: Step) => void;
  onDelete: () => void;
}

function SortableStepCard({ step, index, total, onUpdate, onDelete }: SortableStepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cfg = step.config as any;

  const updateConfig = (patch: Record<string, any>) => {
    onUpdate({ ...step, config: { ...cfg, ...patch } } as Step);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white rounded-xl border border-gray-100 shadow-sm transition-all',
        isDragging ? 'shadow-lg opacity-70 z-10 ring-2 ring-brand-200' : 'hover:border-gray-200'
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {/* Step number badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold flex items-center justify-center">
          {index + 1}
        </span>

        {/* Type selector */}
        <Select
          value={step.type}
          onChange={e => onUpdate({ ...makeEmptyStep(e.target.value as StepType), id: step.id })}
          options={STEP_TYPES.map(t => ({ value: t.value, label: t.label }))}
          className="flex-1 text-sm font-medium"
        />

        {/* Delete button */}
        <button
          onClick={onDelete}
          title="Remove step"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Type hint */}
      <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-50 flex items-center gap-1.5 text-xs text-gray-400">
        {STEP_TYPES.find(t => t.value === step.type)?.icon}
        <span>{STEP_TYPES.find(t => t.value === step.type)?.hint}</span>
      </div>

      {/* Config fields */}
      <div className="p-4 space-y-3">
        {step.type === 'create_task' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project ID">
                <Input
                  type="number"
                  value={cfg.projectId ?? ''}
                  onChange={e => updateConfig({ projectId: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 1"
                  min={1}
                />
              </Field>
              <Field label="Priority">
                <Select
                  value={cfg.priority ?? ''}
                  onChange={e => updateConfig({ priority: e.target.value || undefined })}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                />
              </Field>
            </div>
            <Field label="Title">
              <Input
                value={cfg.title ?? ''}
                onChange={e => updateConfig({ title: e.target.value })}
                placeholder="Task title"
              />
            </Field>
            <Field label="Assigned To (User ID)">
              <Input
                type="number"
                value={cfg.assignedTo ?? ''}
                onChange={e => updateConfig({ assignedTo: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 1"
                min={1}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={cfg.description ?? ''}
                onChange={e => updateConfig({ description: e.target.value })}
                placeholder="Task description..."
                rows={2}
              />
            </Field>
          </>
        )}

        {step.type === 'delay' && (
          <Field label="Duration (milliseconds)" hint="e.g. 5000 = 5 seconds">
            <Input
              type="number"
              value={cfg.ms ?? ''}
              onChange={e => updateConfig({ ms: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 5000"
              min={0}
            />
          </Field>
        )}

        {step.type === 'webhook' && (
          <>
            <Field label="URL" required>
              <Input
                type="url"
                value={cfg.url ?? ''}
                onChange={e => updateConfig({ url: e.target.value })}
                placeholder="https://api.example.com/hook"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <Select
                  value={cfg.method ?? 'POST'}
                  onChange={e => updateConfig({ method: e.target.value })}
                  options={METHOD_OPTIONS}
                />
              </Field>
            </div>
            <Field label="Body (JSON)">
              <Textarea
                value={cfg.body ?? ''}
                onChange={e => updateConfig({ body: e.target.value })}
                placeholder='{"key": "value"}'
                rows={3}
              />
            </Field>
          </>
        )}

        {step.type === 'condition' && (
          <Field label="Expression" hint="JavaScript expression that evaluates to true/false">
            <Input
              value={cfg.expression ?? ''}
              onChange={e => updateConfig({ expression: e.target.value })}
              placeholder="task.priority === 'urgent'"
            />
          </Field>
        )}
      </div>

      {/* Connector arrow (not last) */}
      {index < total - 1 && (
        <div className="px-4 pb-3 flex justify-center">
          <div className="flex items-center gap-1 text-gray-300">
            <ArrowRight size={14} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [runProjectId, setRunProjectId] = useState('');
  const [showRunModal, setShowRunModal] = useState(false);

  const [newForm, setNewForm] = useState<NewWorkflowForm>({ name: '', description: '', trigger_type: 'manual' });
  const [steps, setSteps] = useState<Step[]>([]);
  const [meta, setMeta] = useState({ name: '', description: '' });
  const [metaDirty, setMetaDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load workflows
  useEffect(() => {
    setLoading(true);
    api.getWorkflows().then((d: any) => {
      setWorkflows(d.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load selected workflow
  useEffect(() => {
    if (!selectedId) { setSteps([]); setMeta({ name: '', description: '' }); setMetaDirty(false); return; }
    api.get(`/workflows/${selectedId}`).then((d: any) => {
      const wf: Workflow = d.data;
      setSteps(wf.steps_json ?? []);
      setMeta({ name: wf.name, description: (wf.description ?? '') });
      setMetaDirty(false);
    }).catch(() => {});
  }, [selectedId]);

  const selected = workflows.find(w => w.id === selectedId) ?? null;

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStep = () => {
    const newStep = makeEmptyStep('create_task');
    setSteps(prev => [...prev, newStep]);
  };

  const handleUpdateStep = (updated: Step) => {
    setSteps(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps(prev => {
      const oldIndex = prev.findIndex(s => s.id === active.id);
      const newIndex = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body = {
        name: meta.name || (selected?.name ?? ''),
        description: meta.description,
        trigger_type: selected?.trigger_type ?? 'manual',
        steps_json: steps,
      };
      await api.updateWorkflow(selectedId, body);
      setMetaDirty(false);
      // Refresh list
      const d: any = await api.getWorkflows();
      setWorkflows(d.data ?? []);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name.trim()) { alert('Workflow name is required'); return; }
    setSaving(true);
    try {
      const body = { ...newForm, steps_json: [] };
      const d: any = await api.createWorkflow(body);
      const created: Workflow = d.data;
      setWorkflows(prev => [...prev, created]);
      setSelectedId(created.id);
      setShowNewModal(false);
      setNewForm({ name: '', description: '', trigger_type: 'manual' });
    } catch (e: any) {
      alert('Create failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteWorkflow(deleteTarget.id);
      setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
    setDeleteTarget(null);
  };

  const handleRun = async () => {
    if (!selectedId) return;
    setRunning(true);
    try {
      await api.runWorkflow(selectedId, { projectId: runProjectId ? Number(runProjectId) : undefined });
      setShowRunModal(false);
      setRunProjectId('');
      alert('Workflow triggered successfully!');
    } catch (e: any) {
      alert('Run failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  const canSave = metaDirty || steps.some((s, i) => {
    const orig = selected?.steps_json?.[i];
    return JSON.stringify(s) !== JSON.stringify(orig);
  });

  return (
    <AdminLayout>
      <div className="flex gap-6 h-[calc(100vh-4rem)]">

        {/* ── Left panel: workflow list (1/3) ──────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Workflows</h2>
              <button
                onClick={() => setShowNewModal(true)}
                className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-500 transition-colors"
                title="New workflow"
              >
                <Plus size={16} />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">{search ? 'No workflows match your search' : 'No workflows yet'}</p>
                <Button size="sm" onClick={() => setShowNewModal(true)}>
                  <Plus size={13} /> Create workflow
                </Button>
              </div>
            ) : (
              filteredWorkflows.map(wf => (
                <button
                  key={wf.id}
                  onClick={() => setSelectedId(wf.id)}
                  className={clsx(
                    'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50',
                    selectedId === wf.id ? 'bg-brand-50/60' : ''
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={clsx('text-sm font-medium truncate', selectedId === wf.id ? 'text-brand-700' : 'text-gray-900')}>
                        {wf.name}
                      </div>
                      {wf.description && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{wf.description}</div>
                      )}
                    </div>
                    <span className={clsx(
                      'flex-shrink-0 w-2 h-2 rounded-full mt-1',
                      wf.is_active ? 'bg-green-400' : 'bg-gray-200'
                    )} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: step editor (2/3) ───────────────────────── */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {selectedId === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Zap size={40} className="text-gray-200 mb-4" />
              <p className="text-gray-400 text-sm mb-1">No workflow selected</p>
              <p className="text-gray-300 text-xs max-w-xs">
                Choose a workflow from the left panel to edit its steps, or create a new one.
              </p>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    value={meta.name}
                    onChange={e => { setMeta(m => ({ ...m, name: e.target.value })); setMetaDirty(true); }}
                    className="w-full text-lg font-semibold text-gray-900 outline-none border-b-2 border-transparent focus:border-brand-200 bg-transparent transition-colors"
                    placeholder="Workflow name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setShowRunModal(true); setRunProjectId(''); }}
                  >
                    <Play size={13} /> Run
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    loading={saving}
                    disabled={!canSave}
                  >
                    <Save size={13} /> Save
                  </Button>
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="px-6 py-3 border-b border-gray-50">
                <input
                  value={meta.description}
                  onChange={e => { setMeta(m => ({ ...m, description: e.target.value })); setMetaDirty(true); }}
                  className="w-full text-sm text-gray-500 outline-none placeholder-gray-300 bg-transparent"
                  placeholder="Add a description..."
                />
              </div>

              {/* Steps */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Steps <span className="text-gray-300 font-normal ml-1">({steps.length})</span>
                  </h3>
                  <Button size="sm" variant="secondary" onClick={handleAddStep}>
                    <Plus size={13} /> Add Step
                  </Button>
                </div>

                {steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-100 rounded-xl text-center">
                    <GitBranch size={32} className="text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400 mb-1">No steps yet</p>
                    <p className="text-xs text-gray-300 mb-4">Add steps to define what this workflow does</p>
                    <Button size="sm" onClick={handleAddStep}>
                      <Plus size={13} /> Add First Step
                    </Button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {steps.map((step, index) => (
                          <div key={step.id} className="relative">
                            <SortableStepCard
                              step={step}
                              index={index}
                              total={steps.length}
                              onUpdate={handleUpdateStep}
                              onDelete={() => handleDeleteStep(step.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Create Workflow Modal ──────────────────────────────────── */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Create Workflow" size="sm">
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={newForm.name}
              onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My workflow"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={newForm.description}
              onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this workflow do?"
              rows={2}
            />
          </Field>
          <Field label="Trigger Type">
            <Select
              value={newForm.trigger_type}
              onChange={e => setNewForm(f => ({ ...f, trigger_type: e.target.value }))}
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'event', label: 'Event' },
              ]}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Workflow</Button>
          </div>
        </div>
      </Modal>

      {/* ── Run Workflow Modal ─────────────────────────────────────── */}
      <Modal open={showRunModal} onClose={() => setShowRunModal(false)} title="Run Workflow" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Trigger <span className="font-medium text-gray-700">{meta.name || selected?.name}</span> to run immediately.</p>
          <Field label="Project ID (optional)">
            <Input
              type="number"
              value={runProjectId}
              onChange={e => setRunProjectId(e.target.value)}
              placeholder="Leave empty if not needed"
              min={1}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowRunModal(false)}>Cancel</Button>
            <Button onClick={handleRun} loading={running}>
              <Play size={13} /> Run Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Workflow"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </AdminLayout>
  );
}