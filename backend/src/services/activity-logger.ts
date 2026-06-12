import { db } from '../db/index.js';
import { activityLog } from '../db/schema.js';
import { type activityActionEnum } from '../db/schema.js';

export type ActivityAction = 'created' | 'updated' | 'status_changed' | 'assigned' | 'commented' | 'project_created' | 'task_created' | 'workflow_triggered';

export async function logActivity(params: {
  userId?: number | null;
  projectId?: number | null;
  taskId?: number | null;
  action: ActivityAction;
  details?: Record<string, unknown>;
}) {
  await db.insert(activityLog).values({
    userId: params.userId ?? null,
    projectId: params.projectId ?? null,
    taskId: params.taskId ?? null,
    action: params.action,
    detailsJson: params.details ?? {},
  });
}