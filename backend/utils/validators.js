const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isStrongPassword = (v) =>
  typeof v === 'string' && v.length >= 6;

const isNonEmptyString = (v, max = 255) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

module.exports = { isEmail, isStrongPassword, isNonEmptyString };