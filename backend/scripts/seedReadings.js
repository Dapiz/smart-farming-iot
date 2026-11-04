/**
 * Usage:
 *   node scripts/seedReadings.js <device_id>
 * Contoh:
 *   node scripts/seedReadings.js 1
 *
 * Membuat 500 reading random 7 hari terakhir untuk device tersebut.
 * ⚠️ Hanya untuk testing — jangan dipakai di produksi.
 */
require('dotenv').config();
const pool = require('../config/database');

async function main() {
  const deviceId = parseInt(process.argv[2], 10);
  if (!deviceId) {
    console.error('Usage: node scripts/seedReadings.js <device_id>');
    process.exit(1);
  }

  const [own] = await pool.query('SELECT id, device_name FROM devices WHERE id = ? LIMIT 1', [deviceId]);
  if (own.length === 0) {
    console.error(`Device ${deviceId} tidak ditemukan`);
    process.exit(1);
  }
  console.log(`Seeding untuk device #${deviceId} (${own[0].device_name})...`);

  const total = 500;
  const now   = Date.now();
  const span  = 7 * 24 * 60 * 60 * 1000; // 7 hari

  const values = [];
  for (let i = 0; i < total; i++) {
    const t = new Date(now - (span * i) / total);
    const temperature   = (26 + Math.random() * 6).toFixed(2);
    const humidity      = (60 + Math.random() * 30).toFixed(2);
    const soilMoisture  = (30 + Math.random() * 40).toFixed(2);
    const soilAdc       = Math.round(1500 + Math.random() * 2000);
    const pumpStatus    = Math.random() > 0.85 ? 1 : 0;
    values.push([deviceId, temperature, humidity, soilMoisture, soilAdc, pumpStatus, 'AUTO', t]);
  }

  // Insert batch
  const sql = `INSERT INTO sensor_readings
    (device_id, temperature, humidity, soil_moisture, soil_adc, pump_status, mode, recorded_at)
    VALUES ?`;
  await pool.query(sql, [values]);

  console.log(`✅ Inserted ${total} readings untuk device #${deviceId}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });