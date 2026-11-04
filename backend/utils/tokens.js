const crypto = require('crypto');

/**
 * Buat device_uid publik: "ESP-" + 6 hex uppercase
 * Contoh: ESP-AB12CD
 */
function generateDeviceUid() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ESP-${rand}`;
}

/**
 * Buat device token rahasia: 32 byte hex (64 karakter)
 * Token ini hanya ditampilkan SEKALI saat pairing.
 */
function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateDeviceUid, generateDeviceToken };