import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activity.js';
import workflowRoutes from './routes/workflows.js';
import kbRoutes from './routes/kb.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';
import { logActivity } from './services/activity-logger.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', () => ({ ok: true, ts: Date.now() }));

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/activity', activityRoutes);

// Activity logging for task status changes via PUT /api/tasks/:id
// (handled inside the route itself — just using the existing logActivity call)

// Start
const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TeamFlow API running on port ${PORT}`);
});

export default app;