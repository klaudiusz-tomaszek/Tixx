const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const { validateId } = require('../middleware/validators');

// GET /api/tickets - lista zgłoszeń
router.get('/', ticketsController.getTickets);

// GET /api/tickets/:id - szczegóły zgłoszenia z komentarzami
router.get('/:id', validateId, ticketsController.getTicketById);

// POST /api/tickets - dodanie nowego zgłoszenia
router.post('/', ticketsController.createTicket);

// PATCH /api/tickets/:id/status - zmiana statusu
router.patch('/:id/status', validateId, ticketsController.updateTicketStatus);

// PATCH /api/tickets/:id/priority - zmiana priorytetu
router.patch('/:id/priority', validateId, ticketsController.updateTicketPriority);

// PATCH /api/tickets/:id/assignee - przypisanie osoby
router.patch('/:id/assignee', validateId, ticketsController.updateTicketAssignee);

module.exports = router;

