const Car = require('../models/Car');

const addCar = async (req, res) => {
  try {
    const { brand, model, year, price, mileage, city, condition, transmission, fuel, color, description } = req.body;
    const images = req.files ? req.files.map(f => f.path || f.secure_url || f.url) : [];

    const car = await Car.create({
      user: req.user.id,
      brand, model, year, price, mileage, city, condition, transmission, fuel, color, description,
      images
    });

    res.status(201).json({ message: 'Car listed successfully', car });
  } catch (err) {
    console.error('ADD CAR ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyCars = async (req, res) => {
  try {
    const cars = await Car.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllCars = async (req, res) => {
  try {
    const cars = await Car.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    if (car.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    await car.deleteOne();
    res.json({ message: 'Car removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    if (car.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    const allowedFields = ['brand', 'model', 'year', 'price', 'mileage', 'city', 'condition', 'transmission', 'fuel', 'color', 'description', 'status', 'fabrika'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) car[field] = req.body[field];
    });

    const keptImages = req.body.keptImages ? JSON.parse(req.body.keptImages) : car.images;
    const newImages  = req.files ? req.files.map(f => f.path || f.secure_url || f.url) : [];
    car.images       = [...keptImages, ...newImages];

    const updated = await car.save();
    res.json({ message: 'Car updated successfully', car: updated });
  } catch (err) {
    console.error('UPDATE CAR ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { addCar, getMyCars, getAllCars, deleteCar, updateCar };