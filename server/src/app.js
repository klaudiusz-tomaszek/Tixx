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

// Globalny handler błędów
app.use((err, req, res, next) => {
  console.error('[BŁĄD APLIKACJI]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Wewnętrzny błąd serwera',
  });
});

module.exports = app;
