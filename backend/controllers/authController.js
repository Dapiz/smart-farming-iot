const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const { ok, created, fail } = require('../utils/response');
const { isEmail, isStrongPassword, isNonEmptyString } = require('../utils/validators');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

// =============== REGISTER ===============
async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (!isNonEmptyString(name, 100)) return fail(res, 'Nama wajib diisi (1-100 karakter)', 422);
    if (!isEmail(email)) return fail(res, 'Format email tidak valid', 422);
    if (!isStrongPassword(password)) return fail(res, 'Password minimal 6 karakter', 422);

    const emailNorm = email.trim().toLowerCase();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
    if (existing.length > 0) return fail(res, 'Email sudah terdaftar', 409);

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), emailNorm, hash]
    );

    const userId = result.insertId;

    const accessToken = signAccessToken({ id: userId, email: emailNorm });
    const refreshToken = signRefreshToken({ id: userId });

    return created(res, {
      user: { id: userId, name: name.trim(), email: emailNorm },
      accessToken,
      refreshToken,
    }, 'Registrasi berhasil');
  } catch (err) {
    console.error('register error:', err);
    return fail(res, 'Gagal registrasi', 500);
  }
}

// =============== LOGIN ===============
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!isEmail(email) || !password) return fail(res, 'Email dan password wajib diisi', 422);

    const emailNorm = email.trim().toLowerCase();
    const [rows] = await pool.query(
      'SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1',
      [emailNorm]
    );
    if (rows.length === 0) return fail(res, 'Email atau password salah', 401);

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, 'Email atau password salah', 401);

    const accessToken = signAccessToken({ id: user.id, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id });

    return ok(res, {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    }, 'Login berhasil');
  } catch (err) {
    console.error('login error:', err);
    return fail(res, 'Gagal login', 500);
  }
}

// =============== ME ===============
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) return fail(res, 'User tidak ditemukan', 404);
    return ok(res, rows[0], 'OK');
  } catch (err) {
    console.error('me error:', err);
    return fail(res, 'Gagal mengambil data user', 500);
  }
}

// =============== LOGOUT ===============
// Karena JWT stateless, logout cukup di sisi client (hapus token).
// Endpoint ini hanya untuk konfirmasi & logging.
async function logout(req, res) {
  return ok(res, null, 'Logout berhasil');
}

// =============== FORGOT / RESET PASSWORD ===============
// Disiapkan untuk nanti. Di tahap ini hanya placeholder yang benar-benar berfungsi:
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) return fail(res, 'Format email tidak valid', 422);

    const emailNorm = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);

    // Selalu balas sukses, jangan bocorkan apakah email terdaftar atau tidak
    if (rows.length === 0) {
      return ok(res, null, 'Jika email terdaftar, link reset akan dikirim.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [rows[0].id, tokenHash, expiresAt]
    );

    // Di produksi: kirim via email. Di dev: log ke console
    console.log(`🔑 Reset token untuk ${emailNorm}: ${rawToken}`);

    return ok(res, { devToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined },
      'Jika email terdaftar, link reset akan dikirim.');
  } catch (err) {
    console.error('forgotPassword error:', err);
    return fail(res, 'Gagal memproses permintaan', 500);
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return fail(res, 'Token dan password baru wajib diisi', 422);
    if (!isStrongPassword(newPassword)) return fail(res, 'Password minimal 6 karakter', 422);

    // Cari token yang belum kadaluarsa & belum dipakai
    const [rows] = await pool.query(
      `SELECT id, user_id, token_hash FROM password_reset_tokens
       WHERE used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 100`
    );

    let matched = null;
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(token, row.token_hash)) { matched = row; break; }
    }
    if (!matched) return fail(res, 'Token tidak valid atau sudah kadaluarsa', 400);

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, matched.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [matched.id]);

    return ok(res, null, 'Password berhasil direset. Silakan login.');
  } catch (err) {
    console.error('resetPassword error:', err);
    return fail(res, 'Gagal reset password', 500);
  }
}

// =============== UPDATE PROFILE ===============
async function updateProfile(req, res) {
  try {
    const { name } = req.body || {};
    if (!isNonEmptyString(name, 100)) return fail(res, 'Nama wajib diisi (1-100 karakter)', 422);

    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.user.id]);
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    return ok(res, rows[0], 'Profil berhasil diperbarui');
  } catch (err) {
    console.error('updateProfile:', err);
    return fail(res, 'Gagal memperbarui profil', 500);
  }
}

// =============== CHANGE PASSWORD ===============
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return fail(res, 'Password lama & baru wajib diisi', 422);
    if (!isStrongPassword(newPassword)) return fail(res, 'Password baru minimal 6 karakter', 422);

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return fail(res, 'User tidak ditemukan', 404);

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return fail(res, 'Password lama salah', 401);

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

    return ok(res, null, 'Password berhasil diubah');
  } catch (err) {
    console.error('changePassword:', err);
    return fail(res, 'Gagal mengubah password', 500);
  }
}

module.exports = {
  register, login, me, logout,
  forgotPassword, resetPassword,
  updateProfile, changePassword,
};