import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { migrate } from './migrate.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://teamflow_user:teamflow_pass@postgres:5432/teamflow';
export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS voice;');
    await migrate(client, schema);
  } finally { client.release(); }
}