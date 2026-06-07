const express = require('express');
const router = require('express').Router();
const jwt = require('jsonwebtoken');

const carController = require('../controllers/carController');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    }
  } catch {}
  next();
};

router.get('/', carController.getAllCars);

router.get('/my-cars', protect, carController.getMyCars);
router.get('/filters', carController.getCarFilters);
router.get('/stats',   carController.getCarStats);
router.post('/:id/view', optionalAuth, carController.incrementViews);
router.get('/:id', carController.getCarById);

router.post(
  '/',
  protect,
  upload.array('images', 20),
  carController.addCar
);

router.put(
  '/:id',
  protect,
  upload.array('images', 20),
  carController.updateCar
);

router.delete('/:id', protect, carController.deleteCar);

module.exports = router;