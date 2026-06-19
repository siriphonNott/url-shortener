import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/userController';

export const userRoutes = new Hono<AppBindings>();
userRoutes.use('*', auth);
userRoutes.get('/', ctrl.getUsers);
userRoutes.post('/', ctrl.createUser);
userRoutes.put('/:id', ctrl.updateUser);
userRoutes.delete('/:id', ctrl.deleteUser);
