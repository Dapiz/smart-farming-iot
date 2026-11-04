const express = require('express');
const router = express.Router();

router.use('/auth',      require('./authRoutes'));
router.use('/devices',   require('./deviceRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/device',    require('./deviceApiRoutes'));   // ← ESP32

module.exports = router;