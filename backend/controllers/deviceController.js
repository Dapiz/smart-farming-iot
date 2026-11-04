const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { ok, created, fail } = require('../utils/response');
const { isNonEmptyString } = require('../utils/validators');
const { generateDeviceUid, generateDeviceToken } = require('../utils/tokens');

// =====================================================
// Helper: pastikan device milik user
// =====================================================
async function findOwnedDevice(deviceId, userId) {
  const [rows] = await pool.query(
    `SELECT d.*, 
            s.minimum_soil_moisture, 
            s.maximum_soil_moisture, 
            s.operating_mode
       FROM devices d
       LEFT JOIN device_settings s ON s.device_id = d.id
      WHERE d.id = ? AND d.user_id = ?
      LIMIT 1`,
    [deviceId, userId]
  );
  return rows[0] || null;
}

// =====================================================
// GET /api/devices  → list semua device milik user
// =====================================================
async function listDevices(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT 
          d.id, d.device_uid, d.device_name, d.description, d.location,
          d.status, d.last_seen, d.paired_at, d.created_at,
          s.minimum_soil_moisture, s.maximum_soil_moisture, s.operating_mode,
          (SELECT temperature     FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_temperature,
          (SELECT humidity        FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_humidity,
          (SELECT soil_moisture   FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_soil_moisture,
          (SELECT soil_adc        FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_soil_adc,
          (SELECT pump_status     FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_pump_status,
          (SELECT mode            FROM sensor_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) AS last_mode
         FROM devices d
         LEFT JOIN device_settings s ON s.device_id = d.id
        WHERE d.user_id = ?
        ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('listDevices:', err);
    return fail(res, 'Gagal mengambil daftar perangkat', 500);
  }
}

// =====================================================
// POST /api/devices  → buat device baru + pairing token
// Body: { device_name, description?, location? }
// Response: device + device_token (SEKALI SAJA!)
// =====================================================
async function createDevice(req, res) {
  const conn = await pool.getConnection();
  try {
    const { device_name, description, location } = req.body || {};
    if (!isNonEmptyString(device_name, 100)) {
      return fail(res, 'Nama perangkat wajib diisi (1-100 karakter)', 422);
    }

    // 1) Generate UID unik (retry kalau tabrakan)
    let device_uid = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateDeviceUid();
      const [exist] = await pool.query(
        'SELECT id FROM devices WHERE device_uid = ? LIMIT 1', [candidate]
      );
      if (exist.length === 0) { device_uid = candidate; break; }
    }
    if (!device_uid) return fail(res, 'Gagal membuat device UID, coba lagi', 500);

    // 2) Generate token & hash
    const rawToken = generateDeviceToken();
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // 3) Insert device + settings (transaksi)
    await conn.beginTransaction();

    const [insDevice] = await conn.query(
      `INSERT INTO devices
         (user_id, device_name, description, location, device_uid, device_token_hash, paired_at, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'offline')`,
      [req.user.id, device_name.trim(), description?.trim() || null, location?.trim() || null, device_uid, tokenHash]
    );
    const deviceId = insDevice.insertId;

    await conn.query(
      `INSERT INTO device_settings (device_id, minimum_soil_moisture, maximum_soil_moisture, operating_mode)
       VALUES (?, 40.00, 45.00, 'AUTO')`,
      [deviceId]
    );

    await conn.commit();
    conn.release();

    return created(res, {
      device: {
        id: deviceId,
        device_uid,
        device_name: device_name.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        status: 'offline',
        paired_at: new Date(),
        minimum_soil_moisture: 40,
        maximum_soil_moisture: 45,
        operating_mode: 'AUTO',
      },
      // ⚠️ TOKEN HANYA DITAMPILKAN SEKALI
      device_token: rawToken,
      warning: 'Simpan device_token ini. Tidak akan ditampilkan lagi. Gunakan pada firmware ESP32.',
    }, 'Perangkat berhasil ditambahkan');
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('createDevice:', err);
    return fail(res, 'Gagal menambah perangkat', 500);
  }
}

// =====================================================
// GET /api/devices/:id  → detail device + latest reading
// =====================================================
async function getDevice(req, res) {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) return fail(res, 'Perangkat tidak ditemukan', 404);

    // latest reading
    const [readings] = await pool.query(
      `SELECT temperature, humidity, soil_moisture, soil_adc, pump_status, mode, recorded_at
         FROM sensor_readings WHERE device_id = ?
        ORDER BY recorded_at DESC LIMIT 1`,
      [device.id]
    );

    // pending command (kalau ada)
    const [cmd] = await pool.query(
      `SELECT id, command, status, created_at FROM pump_commands
        WHERE device_id = ? ORDER BY created_at DESC LIMIT 1`,
      [device.id]
    );

    // Jangan bocorkan token hash
    delete device.device_token_hash;

    return ok(res, {
      ...device,
      latest: readings[0] || null,
      last_command: cmd[0] || null,
    }, 'OK');
  } catch (err) {
    console.error('getDevice:', err);
    return fail(res, 'Gagal mengambil detail perangkat', 500);
  }
}

// =====================================================
// PUT /api/devices/:id  → edit metadata device
// Body: { device_name?, description?, location? }
// =====================================================
async function updateDevice(req, res) {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) return fail(res, 'Perangkat tidak ditemukan', 404);

    const { device_name, description, location } = req.body || {};
    const updates = [];
    const values = [];

    if (device_name !== undefined) {
      if (!isNonEmptyString(device_name, 100)) return fail(res, 'Nama perangkat tidak valid', 422);
      updates.push('device_name = ?');
      values.push(device_name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ? description.trim() : null);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location ? location.trim() : null);
    }

    if (updates.length === 0) return fail(res, 'Tidak ada field yang diubah', 400);

    values.push(device.id);
    await pool.query(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, values);

    const updated = await findOwnedDevice(device.id, req.user.id);
    delete updated.device_token_hash;
    return ok(res, updated, 'Perangkat diperbarui');
  } catch (err) {
    console.error('updateDevice:', err);
    return fail(res, 'Gagal memperbarui perangkat', 500);
  }
}

// =====================================================
// DELETE /api/devices/:id
// =====================================================
async function deleteDevice(req, res) {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) return fail(res, 'Perangkat tidak ditemukan', 404);

    await pool.query('DELETE FROM devices WHERE id = ?', [device.id]);
    return ok(res, { id: device.id }, 'Perangkat dihapus');
  } catch (err) {
    console.error('deleteDevice:', err);
    return fail(res, 'Gagal menghapus perangkat', 500);
  }
}

// =====================================================
// POST /api/devices/:id/regenerate-token  → buat ulang token
// (mis. token bocor atau ESP32 di-reset)
// Response: device_token BARU (hanya sekali)
// =====================================================
async function regenerateDeviceToken(req, res) {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) return fail(res, 'Perangkat tidak ditemukan', 404);

    const rawToken = generateDeviceToken();
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await pool.query(
      'UPDATE devices SET device_token_hash = ?, paired_at = NOW() WHERE id = ?',
      [tokenHash, device.id]
    );

    return ok(res, {
      device_id: device.id,
      device_token: rawToken,
      warning: 'Token baru hanya ditampilkan sekali. Update firmware ESP32 Anda sekarang.',
    }, 'Token berhasil dibuat ulang');
  } catch (err) {
    console.error('regenerateDeviceToken:', err);
    return fail(res, 'Gagal regenerate token', 500);
  }
}

// =====================================================
// PUT /api/devices/:id/settings
// Body: { minimum_soil_moisture, maximum_soil_moisture, operating_mode }
// =====================================================
async function updateDeviceSettings(req, res) {
  try {
    const device = await findOwnedDevice(req.params.id, req.user.id);
    if (!device) return fail(res, 'Perangkat tidak ditemukan', 404);

    const { minimum_soil_moisture, maximum_soil_moisture, operating_mode } = req.body || {};

    const min  = minimum_soil_moisture !== undefined ? Number(minimum_soil_moisture) : null;
    const max  = maximum_soil_moisture !== undefined ? Number(maximum_soil_moisture) : null;
    const mode = operating_mode;

    if (min  !== null && (Number.isNaN(min)  || min  < 0 || min  > 100)) return fail(res, 'minimum_soil_moisture harus 0-100', 422);
    if (max  !== null && (Number.isNaN(max)  || max  < 0 || max  > 100)) return fail(res, 'maximum_soil_moisture harus 0-100', 422);
    if (min  !== null && max !== null && min >= max) return fail(res, 'minimum harus < maximum', 422);
    if (mode && !['AUTO', 'MANUAL'].includes(mode)) return fail(res, 'operating_mode harus AUTO atau MANUAL', 422);

    // Validasi: kalau min/max tidak diubah, pastikan hasil akhir min < max
    const currentMin = Number(device.minimum_soil_moisture);
    const currentMax = Number(device.maximum_soil_moisture);
    const finalMin = min !== null ? min : currentMin;
    const finalMax = max !== null ? max : currentMax;
    if (finalMin >= finalMax) return fail(res, 'minimum harus < maximum (cek kombinasi nilai)', 422);

    // Bangun query
    const updates = [];
    const values  = [];
    if (min  !== null) { updates.push('minimum_soil_moisture = ?'); values.push(min); }
    if (max  !== null) { updates.push('maximum_soil_moisture = ?'); values.push(max); }
    if (mode)          { updates.push('operating_mode = ?');        values.push(mode); }

    if (updates.length === 0) return fail(res, 'Tidak ada field yang diubah', 400);

    values.push(device.id);
    await pool.query(`UPDATE device_settings SET ${updates.join(', ')} WHERE device_id = ?`, values);

    // =====================================================
    // Konsekuensi mode transition
    // =====================================================
    const prevMode = device.operating_mode;
    if (mode && mode !== prevMode) {
      if (mode === 'AUTO') {
        // Batalkan semua command PENDING, karena mode AUTO tidak mengeksekusi command manual
        const [pend] = await pool.query(
          `SELECT id FROM pump_commands WHERE device_id = ? AND status = 'PENDING'`,
          [device.id]
        );
        if (pend.length > 0) {
          await pool.query(
            `UPDATE pump_commands SET status = 'EXPIRED' WHERE device_id = ? AND status = 'PENDING'`,
            [device.id]
          );
          const { getIO } = require('../sockets');
          const io = getIO();
          if (io) {
            io.to(`user:${req.user.id}`).emit('pump:ack', {
              device_id: device.id,
              command_id: pend[0].id,
              status: 'EXPIRED',
              reason: 'mode_changed_to_auto',
            });
          }
        }
      }
      // Saat AUTO → MANUAL: pompa tetap sesuai kondisi terakhir,
      // ESP32 akan safety-off jika > 10 menit.
    }

    const [rows] = await pool.query('SELECT * FROM device_settings WHERE device_id = ?', [device.id]);
    return ok(res, rows[0], 'Pengaturan diperbarui');
  } catch (err) {
    console.error('updateDeviceSettings:', err);
    return fail(res, 'Gagal memperbarui pengaturan', 500);
  }
}

module.exports = {
  listDevices, createDevice, getDevice, updateDevice, deleteDevice,
  regenerateDeviceToken, updateDeviceSettings,
};