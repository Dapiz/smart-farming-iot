const pool = require('../config/database');
const { fail } = require('../utils/response');

/**
 * Tolak command jika masih ada command PENDING/EXECUTED
 * dalam 10 detik terakhir untuk device ini.
 */
async function commandRateLimit(req, res, next) {
  try {
    const deviceId = req.params.id;
    if (!deviceId) return next();

    const [rows] = await pool.query(
      `SELECT id, created_at FROM pump_commands
        WHERE device_id = ?
          AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
        ORDER BY created_at DESC LIMIT 1`,
      [deviceId]
    );

    if (rows.length > 0) {
      const secsAgo = Math.floor((Date.now() - new Date(rows[0].created_at).getTime()) / 1000);
      return fail(
        res,
        `Terlalu cepat. Tunggu ${10 - secsAgo} detik sebelum mengirim command lagi.`,
        429
      );
    }

    return next();
  } catch (err) {
    console.error('commandRateLimit:', err);
    return next(); // fail-open, jangan blok user karena error internal
  }
}

module.exports = { commandRateLimit };