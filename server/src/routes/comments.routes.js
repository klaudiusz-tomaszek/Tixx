const express = require('express');
const router = express.Router({ mergeParams: true });
const commentsController = require('../controllers/comments.controller');
const { validateId } = require('../middleware/validators');

// POST /api/tickets/:id/comments
router.post('/', validateId, commentsController.addComment);

module.exports = router;

