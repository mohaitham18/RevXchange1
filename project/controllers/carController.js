const Car = require('../models/Car');

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // 010xxxxxxxx -> 2010xxxxxxxx
  if (digits.length === 11 && digits.startsWith('0')) {
    return '2' + digits;
  }

  // 10xxxxxxxx -> 2010xxxxxxxx
  if (digits.length === 10 && digits.startsWith('1')) {
    return '20' + digits;
  }

  return digits;
};

const addCar = async (req, res) => {
  try {
    console.log('ADD CAR BODY:', req.body);

const {
  brand,
  model,
  year,
  price,
  mileage,
  city,
  condition,
  transmission,
  fuel,
  color,
  description,
  body,
  drivetrain,
  doors,
  seats,
  engine,
  owners,
  service
} = req.body;

  const car = await Car.create({
  user: req.user.id,
  brand,
  model,
  year,
  price,
  mileage,
  city,
  condition,
  transmission,
  fuel,
  color,
  description,
  body,
  drivetrain,
  doors,
  seats,
  engine,
  owners,
  service
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

const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json({ car });
  } catch (err) {
    console.error('GET CAR BY ID ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    if (car.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await car.deleteOne();

    res.json({ message: 'Car removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  addCar,
  getMyCars,
  getAllCars,
  getCarById,
  deleteCar
};