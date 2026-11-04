const pool = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getIO } = require('../sockets');

// =====================================================
// POST /api/devices/:id/pump
// =====================================================
async function controlPump(req, res) {
  try {
    const deviceId = req.params.id;
    const userId   = req.user.id;
    const { command } = req.body || {};

    if (!['ON', 'OFF'].includes(command)) {
      return fail(res, 'command harus ON atau OFF', 422);
    }

    const [rows] = await pool.query(
      `SELECT d.id, d.status, d.last_seen, d.device_name,
              s.operating_mode
         FROM devices d
         LEFT JOIN device_settings s ON s.device_id = d.id
        WHERE d.id = ? AND d.user_id = ? LIMIT 1`,
      [deviceId, userId]
    );
    if (rows.length === 0) return fail(res, 'Perangkat tidak ditemukan', 404);

    const device = rows[0];
    if (device.status !== 'online') {
      return fail(res, 'Perangkat sedang offline. Kontrol manual dinonaktifkan.', 409);
    }
    if (device.operating_mode !== 'MANUAL') {
      return fail(res, 'Mode perangkat bukan MANUAL. Ubah mode di Settings terlebih dahulu.', 409);
    }

    // Cek masih ada pending
    const [pending] = await pool.query(
      'SELECT id FROM pump_commands WHERE device_id = ? AND status = ? LIMIT 1',
      [deviceId, 'PENDING']
    );
    if (pending.length > 0) {
      return fail(res, 'Masih ada perintah yang belum dieksekusi. Tunggu sebentar.', 429);
    }

    const [ins] = await pool.query(
      'INSERT INTO pump_commands (device_id, command, status, created_by) VALUES (?, ?, ?, ?)',
      [deviceId, command, 'PENDING', userId]
    );

    const payload = {
      device_id: Number(deviceId),
      device_name: device.device_name,
      command_id: ins.insertId,
      command,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('pump:pending', payload);

    return ok(res, {
      command_id: ins.insertId,
      device_id: Number(deviceId),
      command,
      status: 'PENDING',
      estimated_timeout: 5 * 60,
    }, 'Perintah dikirim. Menunggu konfirmasi ESP32.');
  } catch (err) {
    console.error('controlPump:', err);
    return fail(res, 'Gagal mengirim perintah', 500);
  }
}

// =====================================================
// GET /api/devices/:id/pump/status
// =====================================================
async function getLatestCommand(req, res) {
  try {
    const deviceId = req.params.id;
    const userId   = req.user.id;

    const [own] = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
      [deviceId, userId]
    );
    if (own.length === 0) return fail(res, 'Perangkat tidak ditemukan', 404);

    const [rows] = await pool.query(
      `SELECT id, command, status, created_at, executed_at
         FROM pump_commands
        WHERE device_id = ?
        ORDER BY created_at DESC
        LIMIT 1`,
      [deviceId]
    );

    return ok(res, rows[0] || null, 'OK');
  } catch (err) {
    console.error('getLatestCommand:', err);
    return fail(res, 'Gagal mengambil command', 500);
  }
}

module.exports = { controlPump, getLatestCommand };