const { getSessionUser } = require('../services/auth.service');
const { asyncHandler } = require('./async-handler');

const SESSION_COOKIE = 'tixx_session';

/**
 * Odczyt pojedynczego ciasteczka z nagłówka Cookie (bez dodatkowych zależności)
 */
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/**
 * Wymaga zalogowanego użytkownika – ustawia req.user albo zwraca 401
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await getSessionUser(readCookie(req, SESSION_COOKIE));
  if (!user) {
    return res.status(401).json({ error: 'Sesja wygasła lub nie jesteś zalogowany' });
  }
  req.user = user;
  next();
});

module.exports = { SESSION_COOKIE, readCookie, cookieOptions, requireAuth };
