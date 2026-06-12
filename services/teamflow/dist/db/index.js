import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://teamflow_user:teamflow_pass@localhost:5432/teamflow';
const client = postgres(DATABASE_URL, { max: 10 });
export const db = drizzle(client, { schema });
