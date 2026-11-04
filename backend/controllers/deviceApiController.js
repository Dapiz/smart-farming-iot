const pool = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getIO } = require('../sockets');
const { markDeviceOnline, markDeviceOffline } = require('../services/devicePresence');

// Ambil settings device
async function getSettings(deviceId) {
  const [rows] = await pool.query(
    'SELECT minimum_soil_moisture, maximum_soil_moisture, operating_mode FROM device_settings WHERE device_id = ? LIMIT 1',
    [deviceId]
  );
  return rows[0] || { minimum_soil_moisture: 40, maximum_soil_moisture: 45, operating_mode: 'AUTO' };
}

// =====================================================
// POST /api/device/telemetry
// Body: {
//   temperature, humidity, soilMoisture, soilADC,
//   pumpStatus (bool), mode ('AUTO'|'MANUAL'),
//   settings?: { minimum_soil_moisture, maximum_soil_moisture } // opsional, ESP32 bisa lapor
// }
// =====================================================
async function postTelemetry(req, res) {
  try {
    const deviceId = req.device.id;
    const {
      temperature, humidity, soilMoisture, soilADC,
      pumpStatus, mode,
    } = req.body || {};

    const t  = Number(temperature);
    const h  = Number(humidity);
    const sm = Number(soilMoisture);
    const adc = Number(soilADC);
    const pump = pumpStatus ? 1 : 0;
    const modeSafe = (mode === 'MANUAL') ? 'MANUAL' : 'AUTO';

    if (Number.isNaN(t) || Number.isNaN(h) || Number.isNaN(sm) || Number.isNaN(adc)) {
      return fail(res, 'Payload telemetry tidak lengkap / tidak valid', 422);
    }

    // Simpan reading
    const [ins] = await pool.query(
      `INSERT INTO sensor_readings
         (device_id, temperature, humidity, soil_moisture, soil_adc, pump_status, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, t, h, sm, adc, pump, modeSafe]
    );

    // Update presence + settings mode (jika ESP32 lapor mode terbaru)
    await pool.query(
      'UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?',
      ['online', deviceId]
    );
        // Update presence
    await pool.query(
      'UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?',
      ['online', deviceId]
    );

    // Ambil settings & metadata device untuk broadcast
    const [devRows] = await pool.query(
      'SELECT id, user_id, device_name, location, status, last_seen FROM devices WHERE id = ? LIMIT 1',
      [deviceId]
    );
    const device = devRows[0];
    const settings = await getSettings(deviceId);

    const payload = {
      device_id: deviceId,
      device_name: device.device_name,
      location: device.location,
      status: 'online',
      last_seen: device.last_seen,
      temperature: t,
      humidity: h,
      soil_moisture: sm,
      soil_adc: adc,
      pump_status: pump,
      mode: modeSafe,
      settings,
      reading_id: ins.insertId,
      recorded_at: new Date().toISOString(),
    };

    // Broadcast via socket ke room user pemilik device
    const io = getIO();
    if (io) {
      io.to(`user:${device.user_id}`).emit('device:update', payload);
    }

    return ok(res, {
      reading_id: ins.insertId,
      // kirim balik settings supaya ESP32 sinkron (mis. batas diubah dari dashboard)
      settings,
      server_time: new Date().toISOString(),
    }, 'Telemetry diterima');
  } catch (err) {
    console.error('postTelemetry:', err);
    return fail(res, 'Gagal menerima telemetry', 500);
  }
}

// =====================================================
// GET /api/device/commands
// Ambil perintah PENDING terbaru (1 per device).
// Kalau perintah lebih tua dari 5 menit → EXPIRED.
// =====================================================
async function getPendingCommand(req, res) {
  try {
    const deviceId = req.device.id;

    // Tandai yang expired
    await pool.query(
      `UPDATE pump_commands
          SET status = 'EXPIRED'
        WHERE device_id = ? AND status = 'PENDING'
          AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [deviceId]
    );

    const [rows] = await pool.query(
      `SELECT id, command, created_at
         FROM pump_commands
        WHERE device_id = ? AND status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1`,
      [deviceId]
    );

    // Update last_seen juga (polling = device hidup)
    await pool.query(
      'UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?',
      ['online', deviceId]
    );

    return ok(res, { command: rows[0] || null }, 'OK');
  } catch (err) {
    console.error('getPendingCommand:', err);
    return fail(res, 'Gagal mengambil command', 500);
  }
}

// =====================================================
// POST /api/device/commands/ack
// Body: { commandId, success: boolean, pumpStatus: boolean }
// =====================================================
async function ackCommand(req, res) {
  try {
    const deviceId = req.device.id;
    const { commandId, success, pumpStatus } = req.body || {};

    if (!commandId) return fail(res, 'commandId wajib diisi', 422);

    const [rows] = await pool.query(
      'SELECT id, status FROM pump_commands WHERE id = ? AND device_id = ? LIMIT 1',
      [commandId, deviceId]
    );
    if (rows.length === 0) return fail(res, 'Command tidak ditemukan', 404);
    if (rows[0].status !== 'PENDING') return fail(res, 'Command sudah dieksekusi', 409);

    const newStatus = success ? 'EXECUTED' : 'FAILED';
    await pool.query(
      'UPDATE pump_commands SET status = ?, executed_at = NOW() WHERE id = ?',
      [newStatus, commandId]
    );

    // Update presence
    await pool.query(
      'UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?',
      ['online', deviceId]
    );

    // Broadcast ke user pemilik
    const [devRows] = await pool.query('SELECT user_id FROM devices WHERE id = ? LIMIT 1', [deviceId]);
    const userId = devRows[0]?.user_id;

    const io = getIO();
    if (io && userId) {
      io.to(`user:${userId}`).emit('pump:ack', {
        device_id: deviceId,
        command_id: commandId,
        status: newStatus,
        pump_status: pumpStatus ? 1 : 0,
        executed_at: new Date().toISOString(),
      });
    }

    return ok(res, { commandId, status: newStatus }, 'Ack diterima');
  } catch (err) {
    console.error('ackCommand:', err);
    return fail(res, 'Gagal menerima ack', 500);
  }
}

module.exports = { postTelemetry, getPendingCommand, ackCommand };