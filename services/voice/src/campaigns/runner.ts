import pool from '../db/index.js';
import { ami } from '../asterisk/ami.js';
import { executeAgent } from '../agents/executor.js';

export interface Campaign {
  id: number;
  agent_id: number;
  name: string;
  status: string;
  contacts: { phone: string; name?: string; id?: number }[];
}

interface AgentRow {
  id: number;
  name: string;
  description: string | null;
  type: string;
  steps: unknown[];
  prompt: string | null;
  voice_id: string | null;
  llm_model: string | null;
}

interface CampaignRow {
  id: number;
  agent_id: number;
  name: string;
  description: string | null;
  status: string;
  schedule_at: Date | null;
  schedule_expr: string | null;
  contacts: { phone: string; name?: string; id?: number }[];
  result: unknown | null;
}

async function getAgent(agentId: number) {
  const { rows } = await pool.query<AgentRow>(
    'SELECT * FROM voice.voice_agents WHERE id = $1 AND is_active = true',
    [agentId]
  );
  if (!rows[0]) throw new Error(`Agent ${agentId} not found`);
  return rows[0] as AgentRow;
}

async function getCampaign(campaignId: number) {
  const { rows } = await pool.query<CampaignRow>(
    'SELECT * FROM voice.campaigns WHERE id = $1',
    [campaignId]
  );
  if (!rows[0]) throw new Error(`Campaign ${campaignId} not found`);
  return rows[0] as CampaignRow;
}

async function updateCampaignStatus(campaignId: number, status: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'running') {
    updates.started_at = new Date();
  } else if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date();
  }
  const setClauses = Object.keys(updates)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ');
  const vals = Object.values(updates);
  await pool.query(
    `UPDATE voice.campaigns SET ${setClauses} WHERE id = $1`,
    [campaignId, ...vals]
  );
}

let activeCampaigns = new Set<number>();

export async function runCampaign(campaignId: number, userId: number): Promise<void> {
  if (activeCampaigns.has(campaignId)) {
    console.warn(`[Runner] Campaign ${campaignId} already running`);
    return;
  }
  activeCampaigns.add(campaignId);

  try {
    const campaign = await getCampaign(campaignId);
    const agent = await getAgent(campaign.agent_id);

    await updateCampaignStatus(campaignId, 'running');
    console.info(`[Runner] Starting campaign ${campaignId}: ${campaign.name}`);

    const contacts = campaign.contacts || [];
    let completed = 0;
    let failed = 0;

    for (const contact of contacts) {
      if (!activeCampaigns.has(campaignId)) {
        console.info(`[Runner] Campaign ${campaignId} stopped mid-run`);
        break;
      }

      const callId = `${campaignId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const context = process.env.ASTERISK_CONTEXT || 'teamflow-inbound';

      console.info(`[Runner] Placing call to ${contact.phone} (call ${callId})`);

      const callLogId = await pool.query<{ id: number }>(
        `INSERT INTO voice.call_logs (campaign_id, agent_id, direction, to_number, started_at, status, metadata)
         VALUES ($1, $2, 'outbound', $3, NOW(), 'initiated', '{}')
         RETURNING id`,
        [campaignId, campaign.agent_id, contact.phone]
      ).then(r => r.rows[0].id);

      try {
        await ami.originate(`Local/${contact.phone}@${context}`, contact.phone, context);

        const result = await executeAgent(
          callId,
          {
            id: agent.id,
            name: agent.name,
            type: agent.type,
            steps: agent.steps as any[],
            prompt: agent.prompt || undefined,
          },
          {
            id: contact.id || 0,
            name: contact.name || 'Unknown',
            phone: contact.phone,
          }
        );

        await pool.query(
          `UPDATE voice.call_logs SET
            ended_at = NOW(),
            duration_secs = 0,
            status = $2,
            transcript = $3,
            summary = $4,
            metadata = $5
           WHERE id = $1`,
          [callLogId, result.status, result.transcript, result.summary, JSON.stringify(result.metadata)]
        );

        if (result.status === 'completed') {
          completed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Runner] Call ${callId} failed:`, (err as Error).message);
        await pool.query(
          `UPDATE voice.call_logs SET ended_at = NOW(), status = 'failed' WHERE id = $1`,
          [callLogId]
        );
        failed++;
      }

      // Small delay between calls to avoid hammering Asterisk
      await new Promise((r) => setTimeout(r, 1000));
    }

    await pool.query(
      `UPDATE voice.campaigns SET result = $2 WHERE id = $1`,
      [campaignId, JSON.stringify({ completed, failed, total: contacts.length })]
    );

    await updateCampaignStatus(campaignId, 'completed');
    console.info(`[Runner] Campaign ${campaignId} complete: ${completed} done, ${failed} failed`);
  } catch (err) {
    console.error(`[Runner] Campaign ${campaignId} error:`, (err as Error).message);
    await updateCampaignStatus(campaignId, 'failed');
  } finally {
    activeCampaigns.delete(campaignId);
  }
}

export function stopCampaign(campaignId: number): void {
  activeCampaigns.delete(campaignId);
  console.info(`[Runner] Campaign ${campaignId} stop requested`);
}