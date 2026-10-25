const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Tixx Web API działa poprawnie',
    uptime: process.uptime(),
    timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: new Date().toLocaleString('pl-PL'),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serwer Tixx uruchomiony na porcie ${PORT}`);
  console.log(`Dostępny pod adresem: http://localhost:${PORT}`);
});

