import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running migrations...');

  // Create enum types if they don't exist
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'team_member');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE workflow_status AS ENUM ('running', 'completed', 'failed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE workflow_trigger AS ENUM ('manual', 'scheduled', 'event');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE activity_action AS ENUM (
        'created', 'updated', 'status_changed', 'assigned', 'commented',
        'project_created', 'task_created', 'workflow_triggered'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL DEFAULT 'team_member',
      avatar_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status project_status NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      status task_status NOT NULL DEFAULT 'todo',
      priority task_priority NOT NULL DEFAULT 'medium',
      due_date TIMESTAMP,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action activity_action NOT NULL,
      details_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      trigger_type workflow_trigger NOT NULL DEFAULT 'manual',
      steps_json JSONB NOT NULL DEFAULT '[]',
      schedule_expr VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      triggered_by INTEGER REFERENCES users(id),
      status workflow_status NOT NULL DEFAULT 'running',
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      result_json JSONB
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100),
      tags TEXT[],
      file_url TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value_json JSONB
    );
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_activity_project_id ON activity_log(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);`);

  console.log('Migrations complete!');
}

migrate().catch(console.error);