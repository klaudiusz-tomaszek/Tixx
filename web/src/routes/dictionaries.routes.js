const express = require('express');
const router = express.Router();
const dictController = require('../controllers/dictionaries.controller');

router.get('/categories', dictController.getCategories);
router.get('/priorities', dictController.getPriorities);
router.get('/statuses', dictController.getStatuses);
router.get('/users', dictController.getUsers);

module.exports = router;

