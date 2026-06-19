import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppBindings } from './env.ts';
import { authRoutes } from './routes/auth';
import { linkRoutes } from './routes/links';
import { userRoutes } from './routes/users';
import { roleRoutes } from './routes/roles';
import { apiKeyRoutes } from './routes/apiKeys';
import { createLink } from './controllers/linkController';
import { auth } from './middleware/auth';

export const app = new Hono<AppBindings>();

app.use('/api/v1/*', cors({ origin: ['https://app.blly.to', 'http://localhost:5173'] }));

app.get('/api/v1/health', (c) => c.json({ success: true, status: 'ok' }));
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/links', linkRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/roles', roleRoutes);
app.route('/api/v1/api-keys', apiKeyRoutes);
app.post('/api/v1/shorten', auth, createLink);

export default app;
