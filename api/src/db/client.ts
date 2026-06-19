import { drizzle } from 'drizzle-orm/d1';
import type { Env } from '../env';
import { schema } from './schema';

export const getDb = (env: Env) => drizzle(env.DB, { schema });
export type DB = ReturnType<typeof getDb>;
