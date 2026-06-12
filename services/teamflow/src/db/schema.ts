import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'team_member']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'paused', 'completed', 'archived']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done', 'blocked']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const workflowStatusEnum = pgEnum('workflow_status', ['running', 'completed', 'failed']);
export const workflowTriggerEnum = pgEnum('workflow_trigger', ['manual', 'scheduled', 'event']);
export const activityActionEnum = pgEnum('activity_action', [
  'created', 'updated', 'status_changed', 'assigned', 'commented',
  'project_created', 'task_created', 'workflow_triggered'
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('team_member'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  assignedTo: integer('assigned_to').references(() => users.id),
  status: taskStatusEnum('status').notNull().default('todo'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  action: activityActionEnum('action').notNull(),
  detailsJson: jsonb('details_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workflowTemplates = pgTable('workflow_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerType: workflowTriggerEnum('trigger_type').notNull().default('manual'),
  stepsJson: jsonb('steps_json').notNull().default([]),
  scheduleExpr: varchar('schedule_expr', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workflowRuns = pgTable('workflow_runs', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => workflowTemplates.id, { onDelete: 'cascade' }).notNull(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  triggeredBy: integer('triggered_by').references(() => users.id),
  status: workflowStatusEnum('status').notNull().default('running'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  resultJson: jsonb('result_json'),
});

export const knowledgeBase = pgTable('knowledge_base', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  tags: text('tags').array(),
  fileUrl: text('file_url'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  valueJson: jsonb('value_json'),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks, { relationName: 'assignedTasks' }),
  createdTasks: many(tasks, { relationName: 'createdTasks' }),
  comments: many(comments),
  activityLogs: many(activityLog),
  workflowRuns: many(workflowRuns),
  kbArticles: many(knowledgeBase),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  tasks: many(tasks),
  activityLogs: many(activityLog),
  workflowRuns: many(workflowRuns),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assignedTo], references: [users.id], relationName: 'assignedTasks' }),
  creator: one(users, { fields: [tasks.createdBy], references: [users.id], relationName: 'createdTasks' }),
  comments: many(comments),
  activityLogs: many(activityLog),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
  project: one(projects, { fields: [activityLog.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [activityLog.taskId], references: [tasks.id] }),
}));

export const workflowTemplatesRelations = relations(workflowTemplates, ({ many }) => ({
  runs: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  template: one(workflowTemplates, { fields: [workflowRuns.templateId], references: [workflowTemplates.id] }),
  project: one(projects, { fields: [workflowRuns.projectId], references: [projects.id] }),
  triggeredByUser: one(users, { fields: [workflowRuns.triggeredBy], references: [users.id] }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  creator: one(users, { fields: [knowledgeBase.createdBy], references: [users.id] }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type KBArticle = typeof knowledgeBase.$inferSelect;