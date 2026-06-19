import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/linkController';

export const linkRoutes = new Hono<AppBindings>();
linkRoutes.use('*', auth);
linkRoutes.get('/', ctrl.getLinks);
linkRoutes.post('/', ctrl.createLink);
linkRoutes.get('/code/:code', ctrl.getLinkByCode);
linkRoutes.put('/:id', ctrl.updateLink);
linkRoutes.delete('/:id', ctrl.deleteLink);
// analytics + logs routes are added in Task 13, which REWRITES this whole file with the final route order.
