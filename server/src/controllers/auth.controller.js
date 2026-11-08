const { verifyCredentials, createSession, deleteSession } = require('../services/auth.service');
const { SESSION_COOKIE, readCookie, cookieOptions } = require('../middleware/auth');

// Ochrona przed zgadywaniem haseł: limit nieudanych prób na parę IP + e-mail
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map(); // klucz → { count, firstAt }

function attemptKey(req, email) {
  return `${req.ip}|${email.toLowerCase()}`;
}

function isLockedOut(key) {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function registerFailure(key) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password, remember = false } = req.body || {};

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Podaj adres e-mail i hasło' });
    }
    if (email.length > 255 || password.length > 200) {
      return res.status(400).json({ error: 'Nieprawidłowy adres e-mail lub hasło' });
    }

    const key = attemptKey(req, email.trim());
    if (isLockedOut(key)) {
      return res.status(429).json({ error: 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za kilka minut.' });
    }

    const user = await verifyCredentials(email.trim(), password);
    if (!user) {
      registerFailure(key);
      return res.status(401).json({ error: 'Nieprawidłowy adres e-mail lub hasło' });
    }
    failedAttempts.delete(key);

    const { token, ttlMs } = await createSession(user.id, Boolean(remember));
    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions(req),
      // Bez „Zapamiętaj mnie” ciasteczko sesyjne znika po zamknięciu przeglądarki
      ...(remember ? { maxAge: ttlMs } : {}),
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    await deleteSession(readCookie(req, SESSION_COOKIE));
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
    res.json({ message: 'Wylogowano' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me (za requireAuth)
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
