const addCar = async (req, res) => {
  try {
    const Car = require('../models/Car');
    console.log('ADD CAR BODY:', req.body);
    const { brand, model, year, price, mileage, city, condition, transmission, fuel, color, description } = req.body;
    const car = await Car.create({
      user: req.user.id,
      brand, model, year, price, mileage, city, condition, transmission, fuel, color, description
    });
    res.status(201).json({ message: 'Car listed successfully', car });
  } catch (err) {
    console.error('ADD CAR ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyCars = async (req, res) => {
  try {
    const Car = require('../models/Car');
    const cars = await Car.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllCars = async (req, res) => {
  try {
    const Car = require('../models/Car');
    const cars = await Car.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCar = async (req, res) => {
  try {
    const Car = require('../models/Car');
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    if (car.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    await car.deleteOne();
    res.json({ message: 'Car removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { addCar, getMyCars, getAllCars, deleteCar };