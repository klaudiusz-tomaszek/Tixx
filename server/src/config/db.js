const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'tixx',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Nieoczekiwany błąd w puli połączeń PostgreSQL:', err.message);
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    return {
      connected: true,
      time: res.rows[0].current_time,
      database: res.rows[0].db_name,
      version: res.rows[0].pg_version.split(' on ')[0],
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
    };
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
};
