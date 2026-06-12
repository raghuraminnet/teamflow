import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, UserPlus, RefreshCw, MessageSquare, Zap, Check,
  CheckCheck, Loader2, X, LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'workflow_completed'
  | 'general';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const ICON_MAP: Record<NotificationType, LucideIcon> = {
  task_assigned: UserPlus,
  task_status_changed: RefreshCw,
  comment_added: MessageSquare,
  workflow_completed: Zap,
  general: Bell,
};

const TYPE_TITLES: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_status_changed: 'Task Status Updated',
  comment_added: 'New Comment',
  workflow_completed: 'Workflow Completed',
  general: 'Notification',
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const API = 'https://api.codeapp.site';

async function fetcher(path: string, accessToken: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const SKELETON_ITEMS = Array.from({ length: 4 });

export function NotificationsBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await fetcher('/notify/me', accessToken);
      setNotifications(Array.isArray(data) ? data : (data.notifications ?? []));
    } catch {
      // silently keep existing list on refresh failure
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 60 s
  useEffect(() => {
    refreshRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchNotifications]);

  // SSE real-time
  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(`${API}/notify/sse`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.addEventListener('connected', () => {
      console.log('[Notifications] SSE connected');
    });

    es.addEventListener('data', (e: MessageEvent) => {
      try {
        const notification: Notification = JSON.parse(e.data);
        setNotifications((prev) => [notification, ...prev]);
      } catch {
        // malformed payload — ignore
      }
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [accessToken]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !dropRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: number) => {
    if (!accessToken || markingId !== null) return;
    setMarkingId(id);
    try {
      await fetcher(`/notify/me/read/${id}`, accessToken, 'PUT');
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // leave as unread on failure
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    if (!accessToken) return;
    setMarkingId(-1);
    try {
      await fetcher('/notify/me/read-all', accessToken, 'PUT');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // no-op
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? (
              <span className="w-2 h-2 rounded-full bg-red-500 flex absolute" />
            ) : (
              unreadCount
            )}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropRef}
          className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-lg border border-gray-100 z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: 480 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingId !== null}
                  className="p-1.5 rounded-md text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors disabled:opacity-40"
                  title="Mark all read"
                >
                  {markingId === -1 ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {SKELETON_ITEMS.map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-50 rounded w-full" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Bell size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] ?? Bell;
                  const bodyPreview =
                    n.body.length > 80 ? n.body.slice(0, 80) + '…' : n.body;

                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 group transition-colors cursor-pointer ${
                        !n.read ? 'bg-brand-50 border-l-2 border-blue-500' : ''
                      } hover:bg-gray-50`}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                      }}
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={15} className="text-gray-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {n.title || TYPE_TITLES[n.type]}
                          </p>
                          {!n.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              disabled={markingId !== null}
                              className="shrink-0 p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                              title="Mark as read"
                            >
                              {markingId === n.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {bodyPreview}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}