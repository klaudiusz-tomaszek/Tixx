const db = require('../config/db');

async function getHealth(req, res) {
  const dbStatus = await db.testConnection();

  const healthData = {
    status: dbStatus.connected ? 'ok' : 'degraded',
    message: dbStatus.connected
      ? 'Tixx Web API i połączenie z bazą PostgreSQL działają poprawnie'
      : 'Serwer działa, lecz połączenie z bazą PostgreSQL nie powiodło się',
    uptime: process.uptime(),
    timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: new Date().toLocaleString('pl-PL'),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };

  const statusCode = dbStatus.connected ? 200 : 503;
  res.status(statusCode).json(healthData);
}

module.exports = {
  getHealth,
};

