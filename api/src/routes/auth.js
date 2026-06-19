const router = require('express').Router();
const auth = require('../middleware/auth');
const { register, login, me, updateProfile, changePassword, getApiKey, regenerateApiKey } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, me);
router.put('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);
router.get('/api-key', auth, getApiKey);
router.post('/api-key/regenerate', auth, regenerateApiKey);

module.exports = router;
