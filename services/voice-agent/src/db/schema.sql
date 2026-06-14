-- Voice Agents schema (PostgreSQL)
-- Standalone calling: no external APIs needed

CREATE TYPE voice_agent_type AS ENUM ('outbound_campaign', 'inbound_ivr', 'status_check');
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE call_status AS ENUM ('queued', 'ringing', 'answered', 'missed', 'failed', 'voicemail', 'completed');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS voice_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type voice_agent_type NOT NULL DEFAULT 'outbound_campaign',
  steps JSONB NOT NULL DEFAULT '[]',
  prompt TEXT,
  voice_id VARCHAR(100) DEFAULT 'en_US-amy-medium',
  llm_provider VARCHAR(20) DEFAULT 'minimax',
  llm_model VARCHAR(100) DEFAULT 'MiniMax-Text-01',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES voice_agents(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status campaign_status DEFAULT 'draft',
  schedule_at TIMESTAMP,
  schedule_expr VARCHAR(100),
  contacts_json JSONB DEFAULT '[]',
  result_json JSONB,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  agent_id INTEGER REFERENCES voice_agents(id),
  direction call_direction NOT NULL,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  duration_secs INTEGER,
  status call_status,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  cost_cents INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_agent ON call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign ON call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);