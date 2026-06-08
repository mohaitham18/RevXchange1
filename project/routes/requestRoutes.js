const express      = require('express');
const router       = express.Router();
const protect      = require('../middleware/auth');
const admin        = require('../middleware/admin'); 
const jwt          = require('jsonwebtoken');
const User         = require('../models/User');

// Optional auth — attaches user if token present, doesn't block if missing
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token    = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user      = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};

// 📦 IMPORT REQUEST CONTROLLERS
const {
  submitRequest,
  getMyRequests,
  getIncomingRequests,
  ownerUpdateRequest,
  adminGetRequests,
  adminUpdateRequest,
  adminDeleteRequest
} = require('../controllers/requestController');

// ── Public & Registered User Endpoints ─────────────────────────
// User submits a request (buy / rent / appointment)
router.post('/', optionalAuth, submitRequest);

// Logged-in user sees their own sent requests
router.get('/mine', protect, getMyRequests);

// Car owner sees requests for their cars
router.get('/incoming', protect, getIncomingRequests);

// Car owner accepts/rejects a request
router.put('/:id/owner-status', protect, ownerUpdateRequest);

// ── Admin Management Endpoints ─────────────────────────
// 🔒 Protects all endpoints below this line so only verified Admins can reach them
router.use(protect, admin);

// Matches: GET /api/requests/
router.get('/', adminGetRequests);

// Matches: DELETE /api/requests/:id
router.delete('/:id', adminDeleteRequest);

// Matches updates for requests under both standard paths used by your frontend panel layout
router.put('/:id', adminUpdateRequest);
router.put('/:id/status', adminUpdateRequest);

module.exports = router;