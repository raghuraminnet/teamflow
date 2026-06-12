import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
// Pages
import LoginPage from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import ClientsPage from '@/pages/admin/Clients';
import ProjectsPage from '@/pages/admin/Projects';
import ProjectDetailPage from '@/pages/admin/ProjectDetail';
import TeamPage from '@/pages/admin/Team';
import WorkflowsPage from '@/pages/admin/Workflows';
import KBAdminPage from '@/pages/admin/KB';
import MyTasksPage from '@/pages/team/MyTasks';
import TeamKBPage from '@/pages/team/KB';
import TeamProjectsPage from '@/pages/team/TeamProjects';
function RequireAuth({ children }) {
    const { user } = useAuthStore();
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
function AdminRoute({ children }) {
    const { user } = useAuthStore();
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (user.role !== 'admin')
        return _jsx(Navigate, { to: "/team", replace: true });
    return _jsx(_Fragment, { children: children });
}
export default function App() {
    const { user } = useAuthStore();
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: user ? _jsx(Navigate, { to: user.role === 'admin' ? '/admin' : '/team', replace: true }) : _jsx(LoginPage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminRoute, { children: _jsx(AdminDashboard, {}) }) }), _jsx(Route, { path: "/admin/clients", element: _jsx(AdminRoute, { children: _jsx(ClientsPage, {}) }) }), _jsx(Route, { path: "/admin/projects", element: _jsx(AdminRoute, { children: _jsx(ProjectsPage, {}) }) }), _jsx(Route, { path: "/admin/projects/:id", element: _jsx(AdminRoute, { children: _jsx(ProjectDetailPage, {}) }) }), _jsx(Route, { path: "/admin/team", element: _jsx(AdminRoute, { children: _jsx(TeamPage, {}) }) }), _jsx(Route, { path: "/admin/workflows", element: _jsx(AdminRoute, { children: _jsx(WorkflowsPage, {}) }) }), _jsx(Route, { path: "/admin/kb", element: _jsx(AdminRoute, { children: _jsx(KBAdminPage, {}) }) }), _jsx(Route, { path: "/team", element: _jsx(RequireAuth, { children: _jsx(MyTasksPage, {}) }) }), _jsx(Route, { path: "/team/projects", element: _jsx(RequireAuth, { children: _jsx(TeamProjectsPage, {}) }) }), _jsx(Route, { path: "/team/projects/:id", element: _jsx(RequireAuth, { children: _jsx(ProjectDetailPage, {}) }) }), _jsx(Route, { path: "/team/kb", element: _jsx(RequireAuth, { children: _jsx(TeamKBPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: user ? user.role === 'admin' ? '/admin' : '/team' : '/login', replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }) }));
}
