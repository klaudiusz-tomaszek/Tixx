const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const ticketsRoutes = require('./tickets.routes');
const commentsRoutes = require('./comments.routes');
const dictionariesRoutes = require('./dictionaries.routes');

router.use('/health', healthRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/tickets/:id/comments', commentsRoutes);
router.use('/dictionaries', dictionariesRoutes);

module.exports = router;
