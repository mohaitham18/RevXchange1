const jwt  = require('jsonwebtoken');
const User = require('../models/User');

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

const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth');
const {
  submitRequest,
  getMyRequests,
  getIncomingRequests,
  ownerUpdateRequest,
  adminGetRequests,
  adminUpdateRequest,
  adminDeleteRequest
} = require('../controllers/requestController');

// ── User routes ───────────────────────────────────────────────
router.post('/', optionalAuth, submitRequest);
router.get('/mine', protect, getMyRequests);

// ── Owner routes ──────────────────────────────────────────────
router.get('/incoming', protect, getIncomingRequests);
router.put('/:id/owner-status', protect, ownerUpdateRequest);

// ── Admin routes ──────────────────────────────────────────────
router.get('/admin', protect, adminGetRequests);
router.put('/admin/:id', protect, adminUpdateRequest);
router.delete('/admin/:id', protect, adminDeleteRequest);

module.exports = router;