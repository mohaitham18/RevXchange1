const express = require('express');
const router  = express.Router();

// ── Model Imports ──────────────────────────────────────────────
const Car = require('../models/Car'); // 🔥 FIXED: Imported Car model so line 60 doesn't crash!

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
router.put('/cars/:id', updateCarStatus);
router.delete('/cars/:id', adminDeleteCar);

// Ensure your route path matches the URL: '/cars/:id/status'
router.put('/cars/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body; 

    if (!status) {
      return res.status(400).json({ message: 'Status field is required.' });
    }

    // Now Car is fully defined and will not crash!
    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason },
      { new: true }
    );

    return res.status(200).json({ success: true, car: updatedCar });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

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