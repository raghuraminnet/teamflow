import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';

// Pages
import LoginPage from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import ClientsPage from '@/pages/admin/Clients';
import ProjectsPage from '@/pages/admin/Projects';
import ProjectDetailPage from '@/pages/admin/ProjectDetail';
import TaskDetailPage from '@/pages/admin/TaskDetail';
import TeamPage from '@/pages/admin/Team';
import WorkflowsPage from '@/pages/admin/Workflows';
import WorkflowBuilderPage from '@/pages/admin/WorkflowBuilder';
import KBAdminPage from '@/pages/admin/KB';
import VoiceAgentsPage from '@/pages/admin/VoiceAgents';
import CampaignsPage from '@/pages/admin/Campaigns';
import CallLogsPage from '@/pages/admin/CallLogs';
import MyTasksPage from '@/pages/team/MyTasks';
import TeamKBPage from '@/pages/team/KB';
import TeamProjectsPage from '@/pages/team/TeamProjects';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/team" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/team'} replace /> : <LoginPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/clients" element={<AdminRoute><ClientsPage /></AdminRoute>} />
        <Route path="/admin/projects" element={<AdminRoute><ProjectsPage /></AdminRoute>} />
        <Route path="/admin/projects/:id" element={<AdminRoute><ProjectDetailPage /></AdminRoute>} />
        <Route path="/admin/tasks/:id" element={<AdminRoute><TaskDetailPage /></AdminRoute>} />
        <Route path="/admin/team" element={<AdminRoute><TeamPage /></AdminRoute>} />
        <Route path="/admin/workflows" element={<AdminRoute><WorkflowsPage /></AdminRoute>} />
        <Route path="/admin/workflows/build/:id" element={<AdminRoute><WorkflowBuilderPage /></AdminRoute>} />
        <Route path="/admin/kb" element={<AdminRoute><KBAdminPage /></AdminRoute>} />
        <Route path="/admin/voice-agents" element={<AdminRoute><VoiceAgentsPage /></AdminRoute>} />
        <Route path="/admin/campaigns" element={<AdminRoute><CampaignsPage /></AdminRoute>} />
        <Route path="/admin/call-logs" element={<AdminRoute><CallLogsPage /></AdminRoute>} />

        {/* Team routes */}
        <Route path="/team" element={<RequireAuth><MyTasksPage /></RequireAuth>} />
        <Route path="/team/projects" element={<RequireAuth><TeamProjectsPage /></RequireAuth>} />
        <Route path="/team/projects/:id" element={<RequireAuth><ProjectDetailPage /></RequireAuth>} />
        <Route path="/team/kb" element={<RequireAuth><TeamKBPage /></RequireAuth>} />

        {/* Redirect root */}
        <Route path="/" element={<Navigate to={user ? user.role === 'admin' ? '/admin' : '/team' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}