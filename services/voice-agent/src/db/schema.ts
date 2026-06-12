import { pgTable, serial, varchar, text, boolean, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const voiceAgentTypeEnum = pgEnum('voice_agent_type', ['outbound_campaign', 'inbound_ivr', 'status_check']);
export const callDirectionEnum = pgEnum('call_direction', ['inbound', 'outbound']);
export const callStatusEnum = pgEnum('call_status', ['queued', 'ringing', 'answered', 'missed', 'failed', 'voicemail', 'completed']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed']);

export const voiceAgents = pgTable('voice_agents', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: voiceAgentTypeEnum('type').notNull(),
  steps: jsonb('steps').$type<AgentStep[]>().notNull().default([]),
  prompt: text('prompt'),
  voiceId: varchar('voice_id', { length: 100 }).default('en_US-amy-medium'),
  llmProvider: varchar('llm_provider', { length: 20 }).default('minimax'),
  llmModel: varchar('llm_model', { length: 100 }).default('MiniMax-Text-01'),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => voiceAgents.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: campaignStatusEnum('status').default('draft'),
  scheduleAt: timestamp('schedule_at'),
  scheduleExpr: varchar('schedule_expr', { length: 100 }),
  contactsJson: jsonb('contacts_json').$type<Contact[]>().default([]),
  resultJson: jsonb('result_json').$type<CampaignResult>(),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

export const callLogs = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  agentId: integer('agent_id').references(() => voiceAgents.id),
  direction: callDirectionEnum('direction').notNull(),
  fromNumber: varchar('from_number', { length: 50 }),
  toNumber: varchar('to_number', { length: 50 }),
  durationSecs: integer('duration_secs'),
  status: callStatusEnum('status'),
  recordingUrl: text('recording_url'),
  transcript: text('transcript'),
  summary: text('summary'),
  costCents: integer('cost_cents'),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  metadata: jsonb('metadata').$type<Record<string,unknown>>(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  variables: jsonb('variables').$type<Record<string,string>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export interface AgentStep {
  id: string;
  type: 'speak' | 'collect' | 'condition' | 'transfer' | 'task_update' | 'delay' | 'end';
  config: Record<string,unknown>;
  nextStepId?: string;
  branchConditions?: { keyword: string; nextStepId: string }[];
}

export interface Contact {
  name: string; phone: string;
  variables: Record<string,string>;
  status?: string; lastCallId?: number;
}

export interface CampaignResult {
  total: number; answered: number; missed: number; failed: number; avgDurationSecs: number;
}