const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const ticketsRoutes = require('./tickets.routes');
const dictionariesRoutes = require('./dictionaries.routes');

router.use('/health', healthRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/dictionaries', dictionariesRoutes);

module.exports = router;

