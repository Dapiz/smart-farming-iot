const ok = (res, data = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data, message = 'Created') =>
  ok(res, data, message, 201);

const fail = (res, message = 'Error', status = 400, errors = null) =>
  res.status(status).json({ success: false, message, errors });

module.exports = { ok, created, fail };