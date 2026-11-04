const { verifyAccessToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 'Token tidak ditemukan. Silakan login.', 401);
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return fail(res, 'Token tidak valid atau kadaluarsa', 401);
  }
}

module.exports = { authRequired };