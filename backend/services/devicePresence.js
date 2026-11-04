const pool = require('../config/database');
const { getIO } = require('../sockets');

async function markStaleDevicesOffline() {
  const threshold = Number(process.env.DEVICE_OFFLINE_THRESHOLD || 60);
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, device_name FROM devices
        WHERE status = 'online'
          AND (last_seen IS NULL OR last_seen < DATE_SUB(NOW(), INTERVAL ? SECOND))`,
      [threshold]
    );
    if (rows.length === 0) return;

    await pool.query(
      `UPDATE devices SET status = 'offline'
        WHERE status = 'online'
          AND (last_seen IS NULL OR last_seen < DATE_SUB(NOW(), INTERVAL ? SECOND))`,
      [threshold]
    );

    const io = getIO();
    if (io) {
      rows.forEach(d => {
        io.to(`user:${d.user_id}`).emit('device:offline', {
          device_id: d.id, device_name: d.device_name, status: 'offline',
        });
      });
    }
    console.log(`📴 ${rows.length} device ditandai offline`);
  } catch (err) {
    console.error('markStaleDevicesOffline:', err);
  }
}

async function markDeviceOnline(deviceId) {
  await pool.query('UPDATE devices SET status = ? , last_seen = NOW() WHERE id = ?', ['online', deviceId]);
}

async function markDeviceOffline(deviceId) {
  await pool.query('UPDATE devices SET status = ? WHERE id = ?', ['offline', deviceId]);
}

module.exports = { markStaleDevicesOffline, markDeviceOnline, markDeviceOffline };