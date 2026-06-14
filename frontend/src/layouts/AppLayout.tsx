import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '@/lib/store';
import { Avatar } from '@/components/Layout';
import { NotificationsBell } from '@/components/Notifications';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Workflow,
  BookOpen, Settings, LogOut, ChevronRight, Layers, Mic, PhoneOutgoing
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
  { label: 'Clients', to: '/admin/clients', icon: <Users size={18} /> },
  { label: 'Projects', to: '/admin/projects', icon: <FolderKanban size={18} /> },
  { label: 'Team', to: '/admin/team', icon: <Layers size={18} /> },
  { label: 'Workflows', to: '/admin/workflows', icon: <Workflow size={18} /> },
  { label: 'Knowledge Base', to: '/admin/kb', icon: <BookOpen size={18} /> },
  { label: 'Voice Agents', to: '/admin/voice-agents', icon: <Mic size={18} /> },
  { label: 'Campaigns', to: '/admin/campaigns', icon: <PhoneOutgoing size={18} /> },
  { label: 'Call Logs', to: '/admin/call-logs', icon: <PhoneOutgoing size={18} /> },
];

const TEAM_NAV: NavItem[] = [
  { label: 'My Tasks', to: '/team', icon: <CheckSquare size={18} /> },
  { label: 'Projects', to: '/team/projects', icon: <FolderKanban size={18} /> },
  { label: 'Knowledge Base', to: '/team/kb', icon: <BookOpen size={18} /> },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : TEAM_NAV;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <CheckSquare size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">TeamFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={active ? 'text-brand-500' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <Avatar name={user?.name ?? 'U'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function TopNav() {
  const { user } = useAuthStore();

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">TeamFlow</span>
      </div>

      <div className="flex items-center gap-4">
        <NotificationsBell />

        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name ?? 'U'} size="sm" />
          <span className="text-sm font-medium text-gray-800">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-56 min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {children}
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <TopNav />
      <div className="ml-56 flex-1 pt-14">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}