const router = require('express').Router();
const { redirect } = require('../controllers/redirectController');

router.get('/:code', redirect);

module.exports = router;
