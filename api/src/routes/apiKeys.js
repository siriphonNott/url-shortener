const router = require('express').Router();
const auth = require('../middleware/auth');
const { listKeys, createKey, updateKey, deleteKey, getKeyStats } = require('../controllers/apiKeyController');

router.get('/', auth, listKeys);
router.post('/', auth, createKey);
router.get('/:id/stats', auth, getKeyStats);
router.put('/:id', auth, updateKey);
router.delete('/:id', auth, deleteKey);

module.exports = router;
