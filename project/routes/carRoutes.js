const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const protect = require('../middleware/auth');

router.get('/', carController.getAllCars);
router.get('/my-cars', protect, carController.getMyCars);
router.post('/', protect, carController.addCar);
router.delete('/:id', protect, carController.deleteCar);

module.exports = router;