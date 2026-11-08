const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const ticketsRoutes = require('./tickets.routes');
const commentsRoutes = require('./comments.routes');
const dictionariesRoutes = require('./dictionaries.routes');
const authRoutes = require('./auth.routes');
const { requireAuth } = require('../middleware/auth');

// Trasy publiczne: logowanie i diagnostyka (monitoring działa bez sesji)
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

// Pozostałe trasy wymagają zalogowanego użytkownika
router.use(requireAuth);
router.use('/tickets', ticketsRoutes);
router.use('/tickets/:id/comments', commentsRoutes);
router.use('/dictionaries', dictionariesRoutes);

module.exports = router;
