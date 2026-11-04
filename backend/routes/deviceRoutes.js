const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { commandRateLimit } = require('../middleware/commandRateLimit');
const ctrl = require('../controllers/deviceController');
const monitoring = require('../controllers/monitoringController');
const pump = require('../controllers/pumpController');

router.use(authRequired);

router.get('/',                      ctrl.listDevices);
router.post('/',                     ctrl.createDevice);
router.get('/:id',                   ctrl.getDevice);
router.put('/:id',                   ctrl.updateDevice);
router.delete('/:id',                ctrl.deleteDevice);
router.post('/:id/regenerate-token', ctrl.regenerateDeviceToken);
router.put('/:id/settings',          ctrl.updateDeviceSettings);
router.get('/:id/history',           monitoring.getHistory);

// Pump control — dengan rate limit
router.post('/:id/pump',              commandRateLimit, pump.controlPump);
router.get('/:id/pump/status',        pump.getLatestCommand);
router.get('/:id/commands/latest',    pump.getLatestCommand); // alias lama

module.exports = router;