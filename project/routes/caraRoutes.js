const express = require('express');
const router = express.Router();
const { caraChat } = require('../controllers/caraController');

router.post('/chat', caraChat);

module.exports = router;