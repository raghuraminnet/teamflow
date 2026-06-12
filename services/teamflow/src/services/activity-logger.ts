import { db } from '../db/index.js';
import { activityLog, tasks } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'commented'
  | 'project_created'
  | 'task_created'
  | 'workflow_triggered';

interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  userId: number;
  actorUserId?: number;
}

async function sendNotify(payload: NotifyPayload): Promise<void> {
  try {
    await fetch('http://notify-svc:3003/notify/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(payload.actorUserId ?? ''),
      },
      body: JSON.stringify({
        type: payload.type,
        title: payload.title,
        body: payload.body,
        targetUserId: payload.userId,
      }),
    });
  } catch (err) {
    // Graceful degradation — never let notify failures break activity logging
    console.error('[activity-logger] notify call failed:', err);
  }
}

async function resolveTaskAssigneeAndOwner(taskId: number | null | undefined) {
  if (!taskId) return { assignedTo: undefined, createdBy: undefined };
  const result = await db
    .select({ assignedTo: tasks.assignedTo, createdBy: tasks.createdBy })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (result.length === 0) return { assignedTo: undefined, createdBy: undefined };
  return result[0];
}

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

  // Fire notifications asynchronously — don't await so logging can't be blocked
  const notifyPromise = (async () => {
    const d = params.details ?? {};

    switch (params.action) {
      case 'task_created': {
        const targetUser = (d.assignedTo as number | undefined) ?? (d.assigneeId as number | undefined);
        if (!targetUser) return;
        return sendNotify({
          type: 'task_created',
          title: 'New task',
          body: String(d.title ?? ''),
          userId: targetUser,
          actorUserId: params.userId ?? undefined,
        });
      }

      case 'assigned': {
        const targetUser = (d.assignedTo as number | undefined) ?? (d.assigneeId as number | undefined);
        if (!targetUser) return;
        return sendNotify({
          type: 'task_assigned',
          title: 'Task assigned to you',
          body: String(d.title ?? ''),
          userId: targetUser,
          actorUserId: params.userId ?? undefined,
        });
      }

      case 'status_changed': {
        if (!params.taskId) return;
        const { createdBy } = await resolveTaskAssigneeAndOwner(params.taskId);
        if (!createdBy) return;
        return sendNotify({
          type: 'task_status_changed',
          title: 'Task status updated',
          body: `Status changed to ${d.to ?? 'unknown'}`,
          userId: createdBy,
          actorUserId: params.userId ?? undefined,
        });
      }

      case 'commented': {
        if (!params.taskId) return;
        const { createdBy } = await resolveTaskAssigneeAndOwner(params.taskId);
        if (!createdBy) return;
        const commentBody = String(d.commentId ?? '');
        return sendNotify({
          type: 'comment_added',
          title: 'New comment',
          body: commentBody.length > 50 ? commentBody.slice(0, 50) : commentBody,
          userId: createdBy,
          actorUserId: params.userId ?? undefined,
        });
      }

      case 'workflow_triggered': {
        if (!params.userId) return;
        return sendNotify({
          type: 'workflow_completed',
          title: 'Workflow completed',
          body: String(d.templateName ?? ''),
          userId: params.userId,
          actorUserId: params.userId,
        });
      }

      default:
        return;
    }
  })();

  // Detach: don't await; errors are caught inside sendNotify
  void notifyPromise.catch(() => {});
}