const pool = require('../config/database');
const { ok, fail } = require('../utils/response');

// =====================================================
// GET /api/devices/:id/history?range=1h|24h|7d|30d
// =====================================================
async function getHistory(req, res) {
  try {
    const deviceId = req.params.id;
    const userId   = req.user.id;
    const range    = req.query.range || '24h';

    // Pastikan device milik user
    const [own] = await pool.query(
      'SELECT id, device_name FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
      [deviceId, userId]
    );
    if (own.length === 0) return fail(res, 'Perangkat tidak ditemukan', 404);

    // Map rentang waktu
    const map = {
      '1h':  { interval: '1 HOUR',    group: '1 MINUTE'  },
      '24h': { interval: '24 HOUR',   group: '10 MINUTE' },
      '7d':  { interval: '7 DAY',     group: '1 HOUR'    },
      '30d': { interval: '30 DAY',    group: '6 HOUR'    },
    };
    const cfg = map[range];
    if (!cfg) return fail(res, 'Range tidak valid. Gunakan 1h|24h|7d|30d', 422);

    // Query dengan agregasi supaya payload ringan
    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(
           DATE_SUB(recorded_at, INTERVAL MOD(MINUTE(recorded_at), ?) MINUTE),
           '%Y-%m-%d %H:%i:00'
         ) AS bucket,
         AVG(temperature)   AS temperature,
         AVG(humidity)      AS humidity,
         AVG(soil_moisture) AS soil_moisture,
         AVG(soil_adc)      AS soil_adc,
         MAX(pump_status)   AS pump_status
       FROM sensor_readings
       WHERE device_id = ?
         AND recorded_at >= DATE_SUB(NOW(), INTERVAL ${cfg.interval})
       GROUP BY bucket
       ORDER BY bucket ASC`,
      [parseInt(cfg.group.split(' ')[0], 10) || 1, deviceId]
    );

    // Nilai numerik bisa string dari AVG() → parse float
    const points = rows.map(r => ({
      time:          r.bucket,
      temperature:   r.temperature   !== null ? Number(r.temperature)   : null,
      humidity:      r.humidity      !== null ? Number(r.humidity)      : null,
      soil_moisture: r.soil_moisture !== null ? Number(r.soil_moisture) : null,
      soil_adc:      r.soil_adc      !== null ? Number(r.soil_adc)      : null,
      pump_status:   r.pump_status   !== null ? Number(r.pump_status)   : 0,
    }));

    return ok(res, { device: own[0], range, points }, 'OK');
  } catch (err) {
    console.error('getHistory:', err);
    return fail(res, 'Gagal mengambil history', 500);
  }
}

// =====================================================
// GET /api/dashboard/summary
// =====================================================
async function getDashboardSummary(req, res) {
  try {
    const userId = req.user.id;

    // Ringkasan device
    const [agg] = await pool.query(
      `SELECT
         COUNT(*) AS total_devices,
         SUM(CASE WHEN status='online'  THEN 1 ELSE 0 END) AS online,
         SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) AS offline
       FROM devices WHERE user_id = ?`,
      [userId]
    );

    // Rata-rata sensor dari reading terakhir tiap device
    const [avg] = await pool.query(
      `SELECT
         AVG(temperature)   AS avg_temperature,
         AVG(humidity)      AS avg_humidity,
         AVG(soil_moisture) AS avg_soil_moisture,
         SUM(CASE WHEN pump_status=1 THEN 1 ELSE 0 END) AS pump_on
       FROM (
         SELECT sr.*
         FROM sensor_readings sr
         JOIN (
           SELECT device_id, MAX(recorded_at) AS max_rt
           FROM sensor_readings
           WHERE device_id IN (SELECT id FROM devices WHERE user_id = ?)
           GROUP BY device_id
         ) latest ON latest.device_id = sr.device_id AND latest.max_rt = sr.recorded_at
       ) t`,
      [userId]
    );

    const row = agg[0] || {};
    const a   = avg[0] || {};

    return ok(res, {
      total_devices:      Number(row.total_devices || 0),
      online:             Number(row.online        || 0),
      offline:            Number(row.offline       || 0),
      pump_on:            Number(a.pump_on         || 0),
      avg_temperature:    a.avg_temperature   !== null && a.avg_temperature   !== undefined ? Number(Number(a.avg_temperature).toFixed(1))   : null,
      avg_humidity:       a.avg_humidity      !== null && a.avg_humidity      !== undefined ? Number(Number(a.avg_humidity).toFixed(1))      : null,
      avg_soil_moisture:  a.avg_soil_moisture !== null && a.avg_soil_moisture !== undefined ? Number(Number(a.avg_soil_moisture).toFixed(1)) : null,
    }, 'OK');
  } catch (err) {
    console.error('getDashboardSummary:', err);
    return fail(res, 'Gagal mengambil ringkasan dashboard', 500);
  }
}

module.exports = { getHistory, getDashboardSummary };