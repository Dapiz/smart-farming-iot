const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { fail } = require('../utils/response');

/**
 * Middleware untuk ESP32.
 * Header wajib:
 *   X-Device-UID   : ESP-XXXXXX (device_uid)
 *   X-Device-Token : <token rahasia hasil pairing>
 */
async function deviceAuth(req, res, next) {
  try {
    const uid   = req.header('X-Device-UID');
    const token = req.header('X-Device-Token');

    if (!uid || !token) {
      return fail(res, 'Header X-Device-UID dan X-Device-Token wajib diisi', 401);
    }

    const [rows] = await pool.query(
      'SELECT id, user_id, device_name, device_token_hash FROM devices WHERE device_uid = ? LIMIT 1',
      [uid]
    );

    if (rows.length === 0) return fail(res, 'Device tidak terdaftar', 401);
    const device = rows[0];

    if (!device.device_token_hash) return fail(res, 'Device belum dipairing', 401);

    const match = await bcrypt.compare(token, device.device_token_hash);
    if (!match) return fail(res, 'Device token tidak valid', 401);

    req.device = {
      id: device.id,
      user_id: device.user_id,
      device_name: device.device_name,
    };
    return next();
  } catch (err) {
    console.error('deviceAuth:', err);
    return fail(res, 'Gagal autentikasi device', 500);
  }
}

module.exports = { deviceAuth };