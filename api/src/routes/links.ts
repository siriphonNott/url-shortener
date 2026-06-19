import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/linkController';
import { fetchPageMeta } from '../lib/meta';

export const linkRoutes = new Hono<AppBindings>();
linkRoutes.use('*', auth);
// Literal GET routes first (so they are never shadowed by a future single-segment :param GET):
linkRoutes.get('/analytics', ctrl.getAnalytics);
linkRoutes.get('/meta', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ success: true, title: '', description: '' });
  try { new URL(url); } catch { return c.json({ success: true, title: '', description: '' }); }
  const meta = await fetchPageMeta(url);
  return c.json({ success: true, ...meta }); // OLD ok(res, meta) → { success:true, title, description }
});
linkRoutes.get('/', ctrl.getLinks);
linkRoutes.post('/', ctrl.createLink);
linkRoutes.get('/code/:code', ctrl.getLinkByCode);
linkRoutes.put('/:id', ctrl.updateLink);
linkRoutes.delete('/:id', ctrl.deleteLink);
linkRoutes.get('/:id/logs', ctrl.getLogs);
linkRoutes.get('/:id/analytics', ctrl.getLinkAnalytics);
