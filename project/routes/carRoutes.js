const express    = require('express');
const router     = express.Router();
const carController = require('../controllers/carController');
const protect    = require('../middleware/auth');
const upload     = require('../middleware/upload');

router.get('/',          carController.getAllCars);
router.get('/my-cars',   protect, carController.getMyCars);
router.post('/',         protect, upload.array('images', 20), carController.addCar);
router.put('/:id',       protect, upload.array('images', 20), carController.updateCar);
router.delete('/:id',    protect, carController.deleteCar);

module.exports = router;