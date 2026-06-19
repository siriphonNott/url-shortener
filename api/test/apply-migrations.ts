import { applyD1Migrations, env } from 'cloudflare:test';

// TEST_MIGRATIONS is injected by vitest.config.ts; apply to the per-test D1 instance.
await applyD1Migrations(env.DB, (env as any).TEST_MIGRATIONS ?? []);
