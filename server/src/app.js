const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();

// Podstawowe middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serwowanie plików statycznych (frontend w Tabler UI)
const clientDir = process.env.CLIENT_DIR || path.join(__dirname, '..', '..', 'client');
app.use(express.static(clientDir));

// Rejestracja tras API (/api/health, /api/tickets, /api/dictionaries, itp.)
app.use('/api', apiRoutes);

// Obsługa nieznanych tras API (404) – musi być przed fallbackiem SPA
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Endpoint nie został odnaleziony',
    path: req.originalUrl,
  });
});

// Trasy aplikacji frontendowej SPA (HTML5 History API) + fallback dla pozostałych tras
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Kody błędów PostgreSQL wynikające z niepoprawnych danych od klienta (→ 400)
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CLIENT_ERRORS = {
  '23503': 'Wskazany powiązany rekord (np. kategoria, priorytet, użytkownik) nie istnieje',
  '22P02': 'Nieprawidłowy format danych wejściowych',
  '22003': 'Wartość liczbowa poza dozwolonym zakresem',
  '22001': 'Wprowadzony tekst jest zbyt długi',
};

// Globalny handler błędów – szczegóły trafiają do logów, a nie do przeglądarki
app.use((err, req, res, next) => {
  if (err.code && PG_CLIENT_ERRORS[err.code]) {
    console.warn(`[BŁĄD DANYCH] ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(400).json({ error: PG_CLIENT_ERRORS[err.code] });
  }

  // Niepoprawny JSON w treści żądania (express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Nieprawidłowy format JSON w treści żądania' });
  }

  const status = err.status || err.statusCode || 500;

  // Błędy 4xx oznaczone jako bezpieczne do pokazania (np. niepoprawny JSON w body)
  if (status < 500 && err.expose) {
    return res.status(status).json({ error: err.message });
  }

  console.error('[BŁĄD APLIKACJI]:', err);
  res.status(status).json({ error: 'Wewnętrzny błąd serwera' });
});

module.exports = app;
