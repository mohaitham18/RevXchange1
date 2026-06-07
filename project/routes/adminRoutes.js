const express = require('express');
const router  = express.Router();

// ── Middleware Imports ─────────────────────────────────────────
const protect = require('../middleware/auth');   
const admin   = require('../middleware/admin');  

const {
  getDashboardStats,
  getAllUsers,
  adminGetAllCars,
  updateCarStatus,
  adminDeleteCar,
  changeUserRole,
  adminDeleteUser
} = require('../controllers/adminController');

const {
  adminGetRequests,
  adminUpdateRequest,
  adminDeleteRequest
} = require('../controllers/requestController');

// 🔒 Global Security Layer
router.use(protect, admin);

// ── Stats Endpoints ────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// ── Cars / Listings Endpoints ──────────────────────────────────
router.get('/cars', adminGetAllCars);
router.put('/cars/:id/status', updateCarStatus);
router.delete('/cars/:id', adminDeleteCar);

// ── Users Endpoints ────────────────────────────────────────────
router.get('/users', getAllUsers);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', adminDeleteUser);

// ── Request Inquiries Endpoints ────────────────────────────────
router.get('/requests', adminGetRequests);
router.delete('/requests/:id', adminDeleteRequest);

// Handles updates for requests under both standard paths used by frontend assets
router.put('/requests/:id', adminUpdateRequest);
router.put('/requests/:id/status', adminUpdateRequest);

module.exports = router;