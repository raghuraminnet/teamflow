import { Client } from 'pg';

export async function migrate(client: Client, _schema: Record<string,unknown>) {
  const sql = [
    `CREATE TABLE IF NOT EXISTS voice.voice_agents (
      id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT,
      type VARCHAR(50) NOT NULL, steps JSONB NOT NULL DEFAULT '[]', prompt TEXT,
      voice_id VARCHAR(100) DEFAULT 'en_US-amy-medium', llm_provider VARCHAR(20) DEFAULT 'minimax',
      llm_model VARCHAR(100) DEFAULT 'MiniMax-Text-01', is_active BOOLEAN DEFAULT true,
      created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`,
    `CREATE TABLE IF NOT EXISTS voice.campaigns (
      id SERIAL PRIMARY KEY, agent_id INTEGER REFERENCES voice.voice_agents(id),
      name VARCHAR(255) NOT NULL, description TEXT, status VARCHAR(50) DEFAULT 'draft',
      schedule_at TIMESTAMPTZ, schedule_expr VARCHAR(100),
      contacts_json JSONB DEFAULT '[]', result_json JSONB,
      created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ);`,
    `CREATE TABLE IF NOT EXISTS voice.call_logs (
      id SERIAL PRIMARY KEY, campaign_id INTEGER REFERENCES voice.campaigns(id),
      agent_id INTEGER REFERENCES voice.voice_agents(id), direction VARCHAR(20) NOT NULL,
      from_number VARCHAR(50), to_number VARCHAR(50), duration_secs INTEGER,
      status VARCHAR(50), recording_url TEXT, transcript TEXT, summary TEXT,
      cost_cents INTEGER, started_at TIMESTAMPTZ DEFAULT NOW(), ended_at TIMESTAMPTZ, metadata JSONB);`,
    `CREATE TABLE IF NOT EXISTS voice.contacts (
      id SERIAL PRIMARY KEY, user_id INTEGER, name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL, variables JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW());`,
  ];
  for (const q of sql) await client.query(q);
}