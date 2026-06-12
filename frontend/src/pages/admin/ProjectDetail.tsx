import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { StatusBadge, PriorityBadge, Avatar, ProjectStatusBadge } from '@/components/Layout';
import { api, type UploadResult } from '@/lib/api';
import { ArrowLeft, Plus, GripVertical, Paperclip, X, UploadCloud } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: number;
  assignedTo?: number;
  assigneeName?: string;
  dueDate?: string;
}

interface ProjectData {
  id: number;
  name: string;
  description?: string;
  status: string;
  tasks: Task[];
}

// Parse attachments from task description (stored as JSON block)
function parseAttachmentsFromDesc(desc?: string): UploadResult[] {
  if (!desc) return [];
  try {
    const match = desc.match(/<!--ATTACHMENTS:({.*})-->/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed._attachments)) return parsed._attachments;
    }
  } catch {}
  return [];
}

// Build updated description, preserving existing non-attachment text
function buildDescription(text: string, attachments: UploadResult[]): string {
  // Strip any existing ATTACHMENTS block
  let baseText = text.replace(/<!--ATTACHMENTS:.*?-->/g, '').trim();
  if (!attachments.length) return baseText;
  const meta = JSON.stringify({ _attachments: attachments });
  return baseText ? `${baseText}\n\n<!--ATTACHMENTS:${meta}-->` : `<!--ATTACHMENTS:${meta}-->`;
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', bg: 'bg-gray-50', border: 'border-gray-200' },
  { key: 'in_progress', label: 'In Progress', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'review', label: 'Review', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'done', label: 'Done', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'blocked', label: 'Blocked', bg: 'bg-red-50', border: 'border-red-200' },
];

function TaskCard({
  task,
  users,
  onEdit,
}: {
  task: Task;
  users: any[];
  onEdit: (t: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-1.5 mb-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </button>
        <PriorityBadge priority={task.priority} />
        <p className="font-medium text-sm text-gray-900 flex-1 leading-snug">{task.title}</p>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 ml-4">{task.description.replace(/<!--ATTACHMENTS:.*?-->/g, '').trim()}</p>
      )}

      {/* Due date */}
      {task.dueDate && (
        <div className={`text-xs ml-4 mb-2 flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {isOverdue && <span className="text-red-500 font-medium">· Overdue</span>}
        </div>
      )}

      <div className="flex items-center justify-between ml-4">
        {task.assigneeName ? (
          <div className="flex items-center gap-1.5">
            <Avatar name={task.assigneeName} size="sm" />
            <span className="text-xs text-gray-400">{task.assigneeName}</span>
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => onEdit(task)}
          className="text-xs text-brand-500 hover:text-brand-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function Column({
  col,
  tasks,
  users,
  onEditTask,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  users: any[];
  onEditTask: (t: Task) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className={`rounded-xl p-3 space-y-2 min-h-32 border-2 border-dashed ${col.bg} ${col.border}`}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} users={users} onEdit={onEditTask} />
          ))}
          {tasks.length === 0 && (
            <div className="h-20 flex items-center justify-center">
              <p className="text-xs text-gray-300">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<UploadResult[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Drag state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getProject(Number(id)),
      api.getUsers(),
    ]).then(([projData, userData]: any[]) => {
      setProject(projData.data);
      setUsers(userData.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const tasksByStatus = (status: string) =>
    project?.tasks.filter(t => t.status === status) ?? [];

  function openCreate() {
    setEditTask(null);
    setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
    setAttachments([]);
    setCreateOpen(true);
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description ?? '',
      assignedTo: task.assignedTo?.toString() ?? '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setAttachments(parseAttachmentsFromDesc(task.description));
    setCreateOpen(true);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditTask(null);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        projectId: Number(id),
        title: form.title,
        description: buildDescription(form.description, attachments),
        assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };

      if (editTask) {
        const res: any = await api.updateTask(editTask.id, body);
        setProject(p => p ? {
          ...p,
          tasks: p.tasks.map(t => t.id === editTask.id ? { ...t, ...res.data } : t),
        } : p);
      } else {
        const res: any = await api.createTask(body);
        setProject(p => p ? { ...p, tasks: [...p.tasks, res.data] } : p);
      }
      closeModal();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask() {
    if (!editTask) return;
    await api.deleteTask(editTask.id);
    setProject(p => p ? { ...p, tasks: p.tasks.filter(t => t.id !== editTask.id) } : p);
    closeModal();
  }

  // ── DnD Handlers ───────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const task = project?.tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!event.over || !project) return;

    const taskId = event.active.id as number;
    const overId = event.over.id as string | number;

    // Determine new status — drop on a column (string) or another task (number → find its status)
    let newStatus: string;
    const overTask = project.tasks.find(t => t.id === overId);
    if (overTask) {
      newStatus = overTask.status;
    } else {
      // Dropped on a column label — use it directly
      newStatus = COLUMNS.find(c => c.key === overId)?.key ?? activeTask?.status ?? 'todo';
    }

    const task = project.tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setProject(p => p ? {
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
    } : p);

    // Persist
    try {
      await api.updateTask(taskId, { status: newStatus });
    } catch {
      // Revert on failure — reload from server
      const res: any = await api.getProject(Number(id));
      setProject(res.data);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-96 bg-white rounded-xl animate-pulse border border-gray-100" />
      </AdminLayout>
    );
  }

  if (!project) {
    return (
      <AdminLayout>
        <p className="text-gray-400">Project not found</p>
        <Button variant="secondary" onClick={() => navigate('/admin/projects')} className="mt-4">
          <ArrowLeft size={16} /> Back to Projects
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => navigate('/admin/projects')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
              <ArrowLeft size={14} /> All Projects
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            <Button onClick={openCreate}><Plus size={16} /> Add Task</Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-5 gap-4 items-start">
            {COLUMNS.map(col => (
              <Column
                key={col.key}
                col={col}
                tasks={tasksByStatus(col.key)}
                users={users}
                onEditTask={openEdit}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="bg-white rounded-lg p-3 shadow-xl border-2 border-brand-300 w-64 opacity-95">
                <div className="flex items-center gap-1.5 mb-1">
                  <PriorityBadge priority={activeTask.priority} />
                  <p className="font-medium text-sm text-gray-900 leading-snug">{activeTask.title}</p>
                </div>
                {activeTask.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 ml-4">
                    {activeTask.description.replace(/<!--ATTACHMENTS:.*?-->/g, '').trim()}
                  </p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create / Edit Task Modal */}
      <Modal
        open={createOpen}
        onClose={closeModal}
        title={editTask ? 'Edit Task' : 'Add Task'}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Task description..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assign to">
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          <Field label="Due Date" hint="Leave empty for no deadline">
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          {/* Attachments section */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Attachments</span>
              {attachments.length > 0 && (
                <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">
                  {attachments.length}
                </span>
              )}
            </div>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100">
                    <Paperclip size={12} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={api.downloadUrl(att.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium truncate block"
                      >
                        {att.filename}
                      </a>
                      <span className="text-xs text-gray-400">
                        {att.size > 1024 * 1024
                          ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(att.size / 1024).toFixed(1)} KB`}
                      </span>
                    </div>
                    <button
                      onClick={() => setAttachments(a => a.filter(x => x.id !== att.id))}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload input */}
            <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 cursor-pointer transition-colors bg-white">
              <UploadCloud size={14} />
              <span>{uploadingFiles ? 'Uploading...' : 'Attach file'}</span>
              <input
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingFiles(true);
                  try {
                    const res = await api.uploadFile(file);
                    setAttachments(a => [...a, res.data]);
                  } catch (err: any) {
                    alert(err.message ?? 'Upload failed');
                  } finally {
                    setUploadingFiles(false);
                    e.target.value = '';
                  }
                }}
                disabled={uploadingFiles}
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Max 10MB · jpg, png, gif, webp, pdf, doc, docx, txt, zip
            </p>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-100">
            <div>
              {editTask && (
                <Button variant="danger" size="sm" onClick={handleDeleteTask}>
                  Delete Task
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>
                {editTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}