const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login',    authLimiter, authController.login);
router.post('/logout',   authRequired, authController.logout);
router.get('/me',        authRequired, authController.me);

router.put('/profile',   authRequired, authController.updateProfile);
router.put('/password',  authRequired, authController.changePassword);

router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password',  authLimiter, authController.resetPassword);

module.exports = router;