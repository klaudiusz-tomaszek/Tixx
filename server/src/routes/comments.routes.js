const express = require('express');
const router = express.Router({ mergeParams: true });
const commentsController = require('../controllers/comments.controller');

// POST /api/tickets/:id/comments
router.post('/', commentsController.addComment);

module.exports = router;

