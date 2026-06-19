const router = require('express').Router();
const auth = require('../middleware/auth');
const { getLinks, createLink, updateLink, deleteLink, deleteLinkByCode, getLogs, getAnalytics, getLinkAnalytics, getLinkByCode, fetchMeta } = require('../controllers/linkController');

router.use(auth);
router.get('/analytics', getAnalytics);
router.get('/meta', fetchMeta);
router.get('/', getLinks);
router.post('/', createLink);
router.get('/code/:code', getLinkByCode);
router.put('/:id', updateLink);
router.delete('/:id', deleteLink);
router.get('/:id/logs', getLogs);
router.get('/:id/analytics', getLinkAnalytics);

module.exports = router;
