const express = require('express');
const router  = express.Router();
const { logSearch, getPopularSearches } = require('../controllers/searchController');

router.post('/',         logSearch);
router.get('/popular',   getPopularSearches);

module.exports = router;