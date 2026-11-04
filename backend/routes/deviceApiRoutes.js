const express = require('express');
const router = express.Router();
const { deviceAuth } = require('../middleware/deviceAuth');
const ctrl = require('../controllers/deviceApiController');

router.use(deviceAuth);

router.post('/telemetry',       ctrl.postTelemetry);
router.get('/commands',         ctrl.getPendingCommand);
router.post('/commands/ack',    ctrl.ackCommand);

module.exports = router;