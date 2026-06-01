const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Attaches req.user if token exists, but doesn't block if missing
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token   = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user      = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/auth');
const {
  submitRequest,
  getMyRequests
} = require('../controllers/requestController');

// Public — but attaches user if logged in (use optionalAuth below)
router.post('/', optionalAuth, submitRequest);

// Protected
router.get('/mine', protect, getMyRequests);

module.exports = router;