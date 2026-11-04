const pool = require('../config/database');
const { getIO } = require('../sockets');

/**
 * Tandai semua command PENDING lebih tua dari 5 menit sebagai EXPIRED.
 * Broadcast `pump:ack` status EXPIRED ke user owner.
 * Dipanggil tiap 30 detik oleh server.js.
 */
async function expireStaleCommands() {
  try {
    // Ambil yang akan expired beserta info device & user
    const [rows] = await pool.query(
      `SELECT pc.id, pc.device_id, pc.command, d.user_id, d.device_name
         FROM pump_commands pc
         JOIN devices d ON d.id = pc.device_id
        WHERE pc.status = 'PENDING'
          AND pc.created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );

    if (rows.length === 0) return;

    // Update
    const ids = rows.map(r => r.id);
    await pool.query(
      `UPDATE pump_commands
          SET status = 'EXPIRED'
        WHERE id IN (?)`,
      [ids]
    );

    // Broadcast ke masing-masing owner
    const io = getIO();
    if (io) {
      rows.forEach(r => {
        io.to(`user:${r.user_id}`).emit('pump:ack', {
          device_id: r.device_id,
          command_id: r.id,
          command: r.command,
          status: 'EXPIRED',
          pump_status: null,
          executed_at: null,
          reason: 'timeout',
        });
      });
    }

    console.log(`⏰ ${rows.length} command PENDING di-expire`);
  } catch (err) {
    console.error('expireStaleCommands:', err);
  }
}

module.exports = { expireStaleCommands };