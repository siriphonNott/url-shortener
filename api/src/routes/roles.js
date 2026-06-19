const router = require('express').Router();
const auth = require('../middleware/auth');
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');

router.get('/', auth, getRoles);
router.post('/', auth, createRole);
router.put('/:id', auth, updateRole);
router.delete('/:id', auth, deleteRole);

module.exports = router;
