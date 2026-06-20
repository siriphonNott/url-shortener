import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/authController';

export const authRoutes = new Hono<AppBindings>();
authRoutes.post('/register', ctrl.register);
authRoutes.post('/login', ctrl.login);
authRoutes.post('/google', ctrl.googleSignin);
authRoutes.get('/me', auth, ctrl.me);
authRoutes.put('/profile', auth, ctrl.updateProfile);
authRoutes.put('/change-password', auth, ctrl.changePassword);
authRoutes.get('/api-key', auth, ctrl.getApiKey);
authRoutes.post('/api-key/regenerate', auth, ctrl.regenerateApiKey);
