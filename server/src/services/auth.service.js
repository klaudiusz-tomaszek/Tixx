const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Czas życia sesji: krótki bez „Zapamiętaj mnie”, długi z zaznaczoną opcją
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;           // 12 h
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;     // 30 dni

// Hash używany, gdy konto nie istnieje – porównanie trwa tyle samo,
// więc czas odpowiedzi nie zdradza, czy dany e-mail jest w bazie
const DUMMY_HASH = bcrypt.hashSync('tixx-dummy-password', 10);

const USER_COLUMNS = `
  u.id, u.first_name, u.last_name, u.email, u.department,
  r.name AS role, r.display_name AS role_name
`;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Tworzy tabelę sesji, jeśli jej brakuje (baza zainicjalizowana przed dodaniem logowania)
 */
async function ensureSessionTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
  `);
}

/**
 * Sprawdza e-mail i hasło. Zwraca użytkownika lub null (bez rozróżniania przyczyny).
 */
async function verifyCredentials(email, password) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS}, u.password_hash, u.is_active
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  const user = rows[0];

  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk || !user.is_active) return null;

  delete user.password_hash;
  delete user.is_active;
  return user;
}

/**
 * Tworzy sesję i zwraca token (do ciasteczka) – w bazie zapisywany jest tylko jego skrót
 */
async function createSession(userId, remember) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttlMs = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;

  // Przy okazji logowania sprzątamy wygasłe sesje
  await db.query('DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP');
  await db.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' milliseconds')::interval)`,
    [userId, hashToken(token), String(ttlMs)]
  );
  return { token, ttlMs };
}

/**
 * Zwraca użytkownika powiązanego z ważną sesją albo null
 */
async function getSessionUser(token) {
  if (!token) return null;
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS}
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
      WHERE s.token_hash = $1
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.is_active = TRUE`,
    [hashToken(token)]
  );
  return rows[0] || null;
}

async function deleteSession(token) {
  if (!token) return;
  await db.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashToken(token)]);
}

module.exports = { ensureSessionTable, verifyCredentials, createSession, getSessionUser, deleteSession };
