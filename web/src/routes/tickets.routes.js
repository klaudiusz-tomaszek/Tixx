const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');

// GET /api/tickets - lista zgłoszeń
router.get('/', ticketsController.getTickets);

// GET /api/tickets/:id - szczegóły zgłoszenia z komentarzami
router.get('/:id', ticketsController.getTicketById);

// POST /api/tickets - dodanie nowego zgłoszenia
router.post('/', ticketsController.createTicket);

module.exports = router;

