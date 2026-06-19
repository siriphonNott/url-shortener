import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  // Reads SQL from ./drizzle (must exist — generated in Task 2). Empty until then; that's fine for Task 1's smoke test.
  const migrations = await readD1Migrations('./drizzle').catch(() => []);
  return {
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.jsonc' },
          singleWorker: true,
          miniflare: {
            compatibilityDate: '2024-09-23',
            compatibilityFlags: ['nodejs_compat'],
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
