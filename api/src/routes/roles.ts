import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/roleController';

export const roleRoutes = new Hono<AppBindings>();
roleRoutes.use('*', auth);
roleRoutes.get('/', ctrl.getRoles);
roleRoutes.post('/', ctrl.createRole);
roleRoutes.put('/:id', ctrl.updateRole);
roleRoutes.delete('/:id', ctrl.deleteRole);
