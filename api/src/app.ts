import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppBindings } from './env.ts';

export const app = new Hono<AppBindings>();

app.use('/api/v1/*', cors({ origin: ['https://app.blly.to', 'http://localhost:5173'] }));

app.get('/api/v1/health', (c) => c.json({ success: true, status: 'ok' }));

export default app;
