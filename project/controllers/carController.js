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
      service,
      listingType,
      rentPricePerDay,
      rentPricePerMonth,
      rentDeposit
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

      listingType: listingType === 'rent' ? 'rent' : 'sale',
      rentPricePerDay: rentPricePerDay ? Number(rentPricePerDay) : null,
      rentPricePerMonth: rentPricePerMonth ? Number(rentPricePerMonth) : null,
      rentDeposit: rentDeposit ? Number(rentDeposit) : null,

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
    const {
      search, brand, city, transmission, fuel,
      minPrice, maxPrice, fabrika, listingType,
      sort = 'newest', page = 1, limit = 12
    } = req.query;

    const query = { status: 'active' };
    const andFilters = [];

    if (listingType === 'rent') {
      andFilters.push({ listingType: 'rent' });
    } else if (listingType === 'sale') {
      andFilters.push({
        $or: [
          { listingType: 'sale' },
          { listingType: { $exists: false } },
          { listingType: null }
        ]
      });
    }

    // Text search across brand, model, city
    if (search) {
      const regex = new RegExp(search, 'i');
      andFilters.push({
        $or: [{ brand: regex }, { model: regex }, { city: regex }]
      });
    }

    if (brand)        query.brand        = new RegExp(`^${brand}$`, 'i');
    if (city)         query.city         = new RegExp(`^${city}$`, 'i');
    if (transmission) query.transmission = new RegExp(`^${transmission}$`, 'i');
    if (fuel)         query.fuel         = new RegExp(`^${fuel}$`, 'i');
    if (fabrika === 'true') query.fabrika = true;

    if (andFilters.length) {
      query.$and = andFilters;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort
    const sortMap = {
      newest:       { createdAt: -1 },
      'price-low':  { price:     1  },
      'price-high': { price:    -1  },
      'year-new':   { year:     -1  },
      'mileage-low':{ mileage:   1  },
      'most-viewed':{ views:    -1  },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    // Pagination
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [cars, total] = await Promise.all([
      Car.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Car.countDocuments(query)
    ]);

    res.json({
      cars,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum
    });
  } catch (err) {
    console.error('GET ALL CARS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getCarStats = async (req, res) => {
  try {
    const [brands, cities, models, prices] = await Promise.all([
      Car.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Car.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Car.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: { model: '$model', brand: '$brand' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Car.aggregate([
        { $match: { status: 'active' } },
        { $bucket: {
          groupBy: '$price',
          boundaries: [0, 100000, 200000, 300000, 400000, 500000, 600000, 800000, 1000000, 1200000, 1500000, 2000000, 3000000, 5000000, 7000000, 10000000],
          default: 'above',
          output: { count: { $sum: 1 } }
        }}
      ])
    ]);

    res.json({ brands, cities, models, prices });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getCarFilters = async (req, res) => {
  try {
    const [brands, cities] = await Promise.all([
      Car.distinct('brand', { status: 'active' }),
      Car.distinct('city',  { status: 'active' })
    ]);
    res.json({
      brands: brands.filter(Boolean).sort(),
      cities: cities.filter(Boolean).sort()
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
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
      'service',
      'listingType',
      'rentPricePerDay',
      'rentPricePerMonth',
      'rentDeposit'
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

const incrementViews = async (req, res) => {
  try {
    const carId = req.params.id;

    // Logged-in user — check viewedCars array in DB
    if (req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const alreadyViewed = user.viewedCars.some(id => id.toString() === carId);
      if (alreadyViewed) return res.json({ skipped: true });

      // Add to viewedCars and increment
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { viewedCars: carId } });
      const car = await Car.findByIdAndUpdate(carId, { $inc: { views: 1 } }, { new: true });
      if (!car) return res.status(404).json({ message: 'Car not found' });
      return res.json({ views: car.views });
    }

    // Guest — just increment (localStorage handles dedup on frontend)
    const car = await Car.findByIdAndUpdate(carId, { $inc: { views: 1 } }, { new: true });
    if (!car) return res.status(404).json({ message: 'Car not found' });
    res.json({ views: car.views });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  addCar,
  getMyCars,
  getAllCars,
  getCarStats,
  getCarFilters,
  getCarById,
  updateCar,
  deleteCar,
  incrementViews
};