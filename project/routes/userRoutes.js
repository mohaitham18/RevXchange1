const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const protect = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);
router.put('/change-password', protect, userController.changePassword);

router.post('/save-car/:carId', protect, userController.toggleSaveCar);
router.get('/saved-cars', protect, userController.getSavedCars);
router.get('/saved-car-ids', protect, userController.getSavedCarIds);

module.exports = router;