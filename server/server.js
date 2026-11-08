const app = require('./src/app');
const db = require('./src/config/db');
const { ensureSessionTable } = require('./src/services/auth.service');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Test połączenia z bazą PostgreSQL przed wystawieniem portu
  console.log('[Tixx] Sprawdzanie połączenia z bazą PostgreSQL...');
  const dbStatus = await db.testConnection();

  if (dbStatus.connected) {
    console.log(`[Tixx] ✅ Połączono z bazą PostgreSQL: "${dbStatus.database}" (${dbStatus.version})`);
    try {
      await ensureSessionTable();
    } catch (err) {
      console.error('[Tixx] ❌ Nie udało się przygotować tabeli sesji (logowanie nie zadziała):', err.message);
    }
  } else {
    console.warn(`[Tixx] ⚠️ Uwaga: Brak połączenia z bazą danych (${dbStatus.error}). Serwer wystartuje, ale zapytania do bazy zwrócą błąd.`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tixx] 🚀 Serwer Tixx uruchomiony na porcie ${PORT}`);
    console.log(`[Tixx] 🌐 Dostępny pod adresem: http://localhost:${PORT}`);
  });
}

startServer();
