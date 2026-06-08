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

const getUploadedFiles = (req, fieldName) => {
  if (!req.files) return [];

  if (Array.isArray(req.files)) {
    return fieldName === 'images' ? req.files : [];
  }

  return req.files[fieldName] || [];
};

const mapFileUrl = (file) => file.path || file.secure_url || file.url || '';

const mapHistoryDocument = (file) => ({
  url: mapFileUrl(file),
  originalName: file.originalname || '',
  mimeType: file.mimetype || ''
});

const isPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
};

const isNonNegativeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
};

const validateEngineValue = (engine) => {
  const value = String(engine || '').trim();

  if (!value) {
    return 'Engine is required.';
  }

  if (value.length < 2 || value.length > 35) {
    return 'Engine must be between 2 and 35 characters.';
  }

  if (!/^[A-Za-z0-9\s.+\-/]+$/.test(value)) {
    return 'Engine can only contain letters, numbers, spaces, dot, +, /, or -.';
  }

  const hasNumber = /\d/.test(value);
  const isElectricText = /\b(electric|ev|hybrid|motor)\b/i.test(value);

  if (!hasNumber && !isElectricText) {
    return 'Engine must include a size/code like 1.6L, V6, or Electric Motor.';
  }

  return '';
};

const validateCarPayload = (body, uploadedHistoryDocuments = [], existingHistoryDocuments = []) => {
  const listingType = body.listingType === 'rent' ? 'rent' : 'sale';

  const engineError = validateEngineValue(body.engine);
  if (engineError) return engineError;

  if (!isPositiveNumber(body.price)) {
    return listingType === 'rent'
      ? 'Daily rent must be a valid number.'
      : 'Sale price must be a valid number.';
  }

  if (listingType === 'sale' && Number(body.price) < 10000) {
    return 'Sale price must be at least 10,000 EGP.';
  }

  if (listingType === 'rent') {
    if (Number(body.price) < 100) {
      return 'Daily rent must be at least 100 EGP.';
    }

    if (!isPositiveNumber(body.rentPricePerDay)) {
      return 'Daily rent is required for rent listings.';
    }

    if (!isPositiveNumber(body.rentPricePerMonth)) {
      return 'Monthly rent is required for rent listings.';
    }

    if (Number(body.rentPricePerMonth) < 1000) {
      return 'Monthly rent must be at least 1,000 EGP.';
    }

    if (Number(body.rentPricePerMonth) <= Number(body.rentPricePerDay)) {
      return 'Monthly rent must be higher than daily rent.';
    }

    if (body.rentDeposit !== undefined && body.rentDeposit !== '' && !isNonNegativeNumber(body.rentDeposit)) {
      return 'Rent deposit must be 0 or more.';
    }
  }

  const service = String(body.service || '').trim();
  const needsDocs = service && service !== 'No History';

  if (needsDocs && uploadedHistoryDocuments.length === 0 && existingHistoryDocuments.length === 0) {
    return 'Upload at least one service-history document, or choose No History.';
  }

  return '';
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

    const imageFiles = getUploadedFiles(req, 'images');
    const historyDocumentFiles = getUploadedFiles(req, 'historyDocuments');

    const validationError = validateCarPayload(req.body, historyDocumentFiles);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const images = imageFiles.map(mapFileUrl).filter(Boolean);
    const historyDocuments = historyDocumentFiles.map(mapHistoryDocument).filter(doc => doc.url);

    const car = await Car.create({
      user: req.user.id,

      brand: (brand || '').trim().replace(/\b\w/g, c => c.toUpperCase()),
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
      rentPricePerMonth: listingType === 'rent' ? Number(rentPricePerMonth) : null,
      rentDeposit: listingType === 'rent' && rentDeposit !== '' && rentDeposit !== undefined ? Number(rentDeposit) : null,

      historyDocuments,
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
        { $group: { _id: { $toLower: '$brand' }, displayName: { $first: '$brand' }, count: { $sum: 1 } } },
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

    const historyDocumentFiles = getUploadedFiles(req, 'historyDocuments');

    let keptHistoryDocuments = car.historyDocuments || [];
    if (req.body.keptHistoryDocuments) {
      try {
        keptHistoryDocuments = JSON.parse(req.body.keptHistoryDocuments);
      } catch {
        keptHistoryDocuments = car.historyDocuments || [];
      }
    }

    const validationError = validateCarPayload(
      { ...car.toObject(), ...req.body },
      historyDocumentFiles,
      keptHistoryDocuments
    );

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        car[field] = req.body[field];
      }
    });

    // Normalize brand name
    if (req.body.brand !== undefined) {
      car.brand = (req.body.brand || '').trim().replace(/\b\w/g, c => c.toUpperCase());
    }

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

    const newImages = getUploadedFiles(req, 'images')
      .map(mapFileUrl)
      .filter(Boolean);

    const newHistoryDocuments = getUploadedFiles(req, 'historyDocuments')
      .map(mapHistoryDocument)
      .filter(doc => doc.url);

    car.images = [...keptImages, ...newImages];
    car.historyDocuments = [...keptHistoryDocuments, ...newHistoryDocuments];

    if (car.listingType !== 'rent') {
      car.rentPricePerDay = null;
      car.rentPricePerMonth = null;
      car.rentDeposit = null;
    } else {
      car.rentPricePerDay = Number(car.rentPricePerDay || car.price);
      car.rentPricePerMonth = Number(car.rentPricePerMonth);
      car.rentDeposit =
        car.rentDeposit !== '' && car.rentDeposit !== undefined && car.rentDeposit !== null
          ? Number(car.rentDeposit)
          : null;
    }

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