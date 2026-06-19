import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/apiKeyController';

export const apiKeyRoutes = new Hono<AppBindings>();
apiKeyRoutes.use('*', auth);
apiKeyRoutes.get('/', ctrl.listKeys);
apiKeyRoutes.post('/', ctrl.createKey);
apiKeyRoutes.get('/:id/stats', ctrl.getKeyStats);
apiKeyRoutes.put('/:id', ctrl.updateKey);
apiKeyRoutes.delete('/:id', ctrl.deleteKey);
