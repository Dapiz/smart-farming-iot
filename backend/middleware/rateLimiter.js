const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,                   // maks 30 request per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

module.exports = { authLimiter };