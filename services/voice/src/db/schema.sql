CREATE SCHEMA IF NOT EXISTS voice;

CREATE TABLE IF NOT EXISTS voice.voice_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,  -- outbound_campaign | inbound_ivr | status_check
  steps JSONB NOT NULL DEFAULT '[]',
  prompt TEXT,
  voice_id VARCHAR(100),
  llm_model VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice.campaigns (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES voice.voice_agents(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  schedule_at TIMESTAMPTZ,
  schedule_expr VARCHAR(100),
  contacts JSONB DEFAULT '[]',
  result JSONB,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS voice.call_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER,
  agent_id INTEGER,
  direction VARCHAR(20) NOT NULL,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  duration_secs INTEGER,
  status VARCHAR(50),
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS voice.contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);