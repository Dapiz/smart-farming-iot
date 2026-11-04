const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const monitoring = require('../controllers/monitoringController');

router.use(authRequired);
router.get('/summary', monitoring.getDashboardSummary);

module.exports = router;