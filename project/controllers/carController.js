const Car = require('../models/Car');

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 11 && digits.startsWith('0')) {
    return '2' + digits;
  }

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
      phone,
      fabrika,
      body,
      drivetrain,
      doors,
      seats,
      engine,
      owners,
      service
    } = req.body;

    const images = req.files
      ? req.files.map(file => file.path || file.secure_url || file.url)
      : [];

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

      phone: normalizePhone(phone),
      fabrika: fabrika === true || fabrika === 'true' || fabrika === 'yes',

      body,
      drivetrain,
      doors,
      seats,
      engine,
      owners,
      service,

      images
    });

    res.status(201).json({
      message: 'Car listed successfully',
      car
    });
  } catch (err) {
    console.error('ADD CAR ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

const getMyCars = async (req, res) => {
  try {
    const cars = await Car.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    console.error('GET MY CARS ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

const getAllCars = async (req, res) => {
  try {
    const cars = await Car.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    console.error('GET ALL CARS ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        message: 'Car not found'
      });
    }

    res.json({ car });
  } catch (err) {
    console.error('GET CAR BY ID ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        message: 'Car not found'
      });
    }

    if (car.user.toString() !== req.user.id) {
      return res.status(401).json({
        message: 'Not authorized'
      });
    }

    const allowedFields = [
      'brand',
      'model',
      'year',
      'price',
      'mileage',
      'city',
      'condition',
      'transmission',
      'fuel',
      'color',
      'description',
      'status',
      'fabrika',
      'body',
      'drivetrain',
      'doors',
      'seats',
      'engine',
      'owners',
      'service'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        car[field] = req.body[field];
      }
    });

    if (req.body.phone !== undefined) {
      car.phone = normalizePhone(req.body.phone);
    }

    if (req.body.fabrika !== undefined) {
      car.fabrika =
        req.body.fabrika === true ||
        req.body.fabrika === 'true' ||
        req.body.fabrika === 'yes';
    }

    let keptImages = car.images || [];

    if (req.body.keptImages) {
      try {
        keptImages = JSON.parse(req.body.keptImages);
      } catch {
        keptImages = car.images || [];
      }
    }

    const newImages = req.files
      ? req.files.map(file => file.path || file.secure_url || file.url)
      : [];

    car.images = [...keptImages, ...newImages];

    const updated = await car.save();

    res.json({
      message: 'Car updated successfully',
      car: updated
    });
  } catch (err) {
    console.error('UPDATE CAR ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        message: 'Car not found'
      });
    }

    if (car.user.toString() !== req.user.id) {
      return res.status(401).json({
        message: 'Not authorized'
      });
    }

    await car.deleteOne();

    res.json({
      message: 'Car removed'
    });
  } catch (err) {
    console.error('DELETE CAR ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

module.exports = {
  addCar,
  getMyCars,
  getAllCars,
  getCarById,
  updateCar,
  deleteCar
};