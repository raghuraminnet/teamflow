import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AppLayout';
import { Modal } from '@/components/Modal';
import { Button, Field, Input, Textarea } from '@/components/FormFields';
import { StatusBadge, PriorityBadge, Avatar } from '@/components/Layout';
import { api } from '@/lib/api';
import { ArrowLeft, MessageSquare, Send, Clock, User, Calendar } from 'lucide-react';

interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorRole?: string;
  createdAt: string;
}

interface ActivityEntry {
  id: number;
  taskId?: number;
  action: string;
  userId: number;
  userName: string;
  createdAt: string;
}

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
  comments?: Comment[];
  projectName?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskId = Number(id);

  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getTask(Number(id)),
      api.getUsers(),
    ]).then(([taskData, userData]: [any, any]) => {
      const t: Task = taskData.data;
      setTask(t);
      setComments(t.comments ?? []);
      setUsers(userData.data ?? []);
      setForm({
        title: t.title,
        description: t.description ?? '',
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?.toString() ?? '',
        dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      });

      // Activity for this task's project, filtered to this taskId
      if (t.projectId) {
        return api.getProjectActivity(t.projectId);
      }
      return null;
    }).then((actData: any) => {
      if (actData?.data) {
        const filtered = (actData.data as ActivityEntry[]).filter(a => a.taskId === taskId);
        setActivity(filtered);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, taskId]);

  async function handlePostComment() {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res: any = await api.addComment(taskId, commentText);
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPostingComment(false);
    }
  }

  function openEdit() {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo?.toString() ?? '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      const res: any = await api.updateTask(taskId, body);
      setTask(res.data);
      setEditOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.deleteTask(taskId);
      navigate(`/admin/projects/${task?.projectId}`);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() && task?.status !== 'done';

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-40 bg-white rounded-xl animate-pulse border border-gray-100" />
              <div className="h-64 bg-white rounded-xl animate-pulse border border-gray-100" />
            </div>
            <div className="h-80 bg-white rounded-xl animate-pulse border border-gray-100" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!task) {
    return (
      <AdminLayout>
        <p className="text-gray-400">Task not found</p>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft size={16} /> Go Back
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate(`/admin/projects/${task.projectId}`)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            {task.projectName ? `${task.projectName}` : 'Back to Project'}
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>
            <Button variant="secondary" size="sm" onClick={openEdit}>
              Edit Task
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main column */}
          <div className="col-span-2 space-y-6">

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {task.description || <span className="text-gray-300 italic">No description provided.</span>}
              </p>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Comments
                  {comments.length > 0 && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {comments.length}
                    </span>
                  )}
                </h3>
              </div>

              <div className="space-y-4 mb-5">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-300 italic py-4 text-center">No comments yet. Be the first!</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar name={comment.authorName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                          {comment.authorRole === 'admin' && (
                            <span className="text-xs bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">Admin</span>
                          )}
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} />
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Post comment */}
              <div className="flex gap-2">
                <Avatar name={task.assigneeName ?? 'Me'} size="sm" />
                <div className="flex-1 flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="flex-1 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handlePostComment();
                      }
                    }}
                  />
                  <Button
                    onClick={handlePostComment}
                    loading={postingComment}
                    disabled={!commentText.trim()}
                    size="sm"
                    className="self-end"
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Task info */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h3>

              <div className="space-y-3">
                {/* Assignee */}
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400 w-16 shrink-0">Assignee</span>
                  {task.assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.assigneeName} size="sm" />
                      <span className="text-sm text-gray-700">{task.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300 italic">Unassigned</span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" style={{ marginTop: '1px' }} />
                  <span className="text-xs text-gray-400 w-16 shrink-0">Status</span>
                  <StatusBadge status={task.status} />
                </div>

                {/* Priority */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm border border-gray-300 shrink-0" style={{ marginTop: '2px' }} />
                  <span className="text-xs text-gray-400 w-16 shrink-0">Priority</span>
                  <PriorityBadge priority={task.priority} />
                </div>

                {/* Due date */}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400 w-16 shrink-0">Due Date</span>
                  {task.dueDate ? (
                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                      {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue && <span className="ml-1.5 text-xs text-red-500 font-medium">· Overdue</span>}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300 italic">No deadline</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button variant="secondary" size="sm" onClick={openEdit} className="flex-1 justify-center">
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>

            {/* Activity log */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity</h3>
              {activity.length === 0 ? (
                <p className="text-xs text-gray-300 italic py-2">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(entry => (
                    <div key={entry.id} className="flex gap-2.5">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          <span className="font-medium text-gray-900">{entry.userName}</span>{' '}
                          {entry.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <Modal open={editOpen} onClose={closeEdit} title="Edit Task" size="md">
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
            <Field label="Status">
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assign to">
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}