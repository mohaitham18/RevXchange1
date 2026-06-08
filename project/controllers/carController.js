const Car = require('../models/Car');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

const positiveNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
};

const numberOrNull = value => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeVisibility = value => {
  return value === 'public' ? 'public' : 'private';
};

const validEngine = value => {
  const engine = String(value || '').trim();

  if (!engine) return false;
  if (engine.length < 2 || engine.length > 35) return false;
  if (!/^[A-Za-z0-9.\-\s]+$/.test(engine)) return false;

  // Accept normal engine specs like 1.6L Turbo, V6 3.0, 2.0 TSI, Electric, Hybrid.
  return /\d/.test(engine) || /\b(electric|hybrid)\b/i.test(engine);
};

const parseJsonArray = value => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const getFiles = (req, field) => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return field === 'images' ? req.files : [];
  return Array.isArray(req.files[field]) ? req.files[field] : [];
};

const uploadBufferToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

const uploadImages = async files => {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file, 'revxchange/cars');
    uploaded.push(result.secure_url || result.url);
  }

  return uploaded.filter(Boolean);
};

const uploadHistoryDocs = async files => {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file, 'revxchange/history-docs');

    uploaded.push({
      url: result.secure_url || result.url,
      originalName: file.originalname || 'History document',
      mimeType: file.mimetype || '',
      size: file.size || 0,
      resourceType: result.resource_type || 'auto',
      uploadedAt: new Date()
    });
  }

  return uploaded.filter(doc => doc.url);
};

const docsAreRequiredForService = service => {
  const value = String(service || '').toLowerCase();
  return value.includes('full') || value.includes('partial');
};

const validateCarPayload = ({ body, imageFiles = [], historyDocFiles = [], existingCar = null, isUpdate = false }) => {
  const listingType = body.listingType === 'rent' ? 'rent' : 'sale';

  if (!positiveNumber(body.price)) {
    return listingType === 'rent'
      ? 'Enter a valid daily rent in EGP.'
      : 'Enter a valid price in EGP.';
  }

  if (listingType === 'rent') {
    const dailyRent = body.rentPricePerDay || body.price;

    if (!positiveNumber(dailyRent)) {
      return 'Enter a valid daily rent in EGP.';
    }

    if (!positiveNumber(body.rentPricePerMonth)) {
      return 'Enter a valid monthly rent in EGP.';
    }

    if (!positiveNumber(body.rentDeposit)) {
      return 'Enter a valid rent deposit in EGP.';
    }

    if (Number(body.rentPricePerMonth) <= Number(dailyRent)) {
      return 'Monthly rent must be higher than daily rent.';
    }
  }

  const engine = body.engine !== undefined
    ? body.engine
    : existingCar?.engine;

  if (!validEngine(engine)) {
    return 'Enter a valid engine value like 1.6L, 1.6L Turbo, V6 3.0, Electric, or Hybrid.';
  }

  const service = body.service !== undefined
    ? body.service
    : existingCar?.service;

  const existingDocsCount = Array.isArray(existingCar?.historyDocs)
    ? existingCar.historyDocs.length
    : 0;

  const shouldCheckDocs = !isUpdate || body.service !== undefined || historyDocFiles.length > 0;

  if (shouldCheckDocs && docsAreRequiredForService(service) && existingDocsCount + historyDocFiles.length === 0) {
    return 'Upload at least one service history document for Full History or Partial History.';
  }

  if (historyDocFiles.length > 5) {
    return 'You can upload up to 5 history documents only.';
  }

  if (imageFiles.length > 20) {
    return 'You can upload up to 20 car images only.';
  }

  return null;
};

const serializeCar = (car, options = {}) => {
  const { owner = false, admin = false } = options;
  const obj = typeof car.toObject === 'function' ? car.toObject() : { ...car };
  const docs = Array.isArray(obj.historyDocs) ? obj.historyDocs : [];

  obj.historyDocsCount = docs.length;
  obj.hasHistoryDocs = docs.length > 0;
  obj.historyDocsVisibility = normalizeVisibility(obj.historyDocsVisibility);

  if (!owner && !admin && obj.historyDocsVisibility !== 'public') {
    obj.historyDocs = [];
  }

  return obj;
};

const buildCarData = (req, images, historyDocs) => {
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
    rentDeposit,
    historyDocsVisibility,
    highlights,
    included
  } = req.body;

  const finalListingType = listingType === 'rent' ? 'rent' : 'sale';

  return {
    user: req.user.id || req.user._id,

    brand: (brand || '').trim().replace(/\b\w/g, c => c.toUpperCase()),
    model,
    year: Number(year),
    price: Number(price),
    mileage: Number(mileage),
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
    doors: Number(doors) || 4,
    seats: Number(seats) || 5,
    engine: String(engine || '').trim(),
    owners,
    service,

    historyDocsVisibility: normalizeVisibility(historyDocsVisibility),
    historyDocs,

    listingType: finalListingType,
    rentPricePerDay: finalListingType === 'rent' ? Number(rentPricePerDay || price) : null,
    rentPricePerMonth: finalListingType === 'rent' ? numberOrNull(rentPricePerMonth) : null,
    rentDeposit: finalListingType === 'rent' ? numberOrNull(rentDeposit) : null,

    highlights: parseJsonArray(highlights),
    included: parseJsonArray(included),

    images
  };
};

const addCar = async (req, res) => {
  try {
    const imageFiles = getFiles(req, 'images');
    const historyDocFiles = getFiles(req, 'historyDocs');

    const validationError = validateCarPayload({
      body: req.body,
      imageFiles,
      historyDocFiles
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [images, historyDocs] = await Promise.all([
      uploadImages(imageFiles),
      uploadHistoryDocs(historyDocFiles)
    ]);

    const car = await Car.create(buildCarData(req, images, historyDocs));

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
    const cars = await Car.find({ user: req.user.id || req.user._id }).sort({ createdAt: -1 });
    res.json({ cars: cars.map(car => serializeCar(car, { owner: true })) });
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

    if (search) {
      const regex = new RegExp(search, 'i');
      andFilters.push({
        $or: [{ brand: regex }, { model: regex }, { city: regex }]
      });
    }

    if (brand) query.brand = new RegExp(`^${brand}$`, 'i');
    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (transmission) query.transmission = new RegExp(`^${transmission}$`, 'i');
    if (fuel) query.fuel = new RegExp(`^${fuel}$`, 'i');
    if (fabrika === 'true') query.fabrika = true;

    if (andFilters.length) {
      query.$and = andFilters;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      'price-low': { price: 1 },
      'price-high': { price: -1 },
      'year-new': { year: -1 },
      'mileage-low': { mileage: 1 },
      'most-viewed': { views: -1 }
    };

    const sortObj = sortMap[sort] || { createdAt: -1 };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [cars, total] = await Promise.all([
      Car.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Car.countDocuments(query)
    ]);

    res.json({
      cars: cars.map(car => serializeCar(car)),
      total,
      page: pageNum,
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
      Car.distinct('city', { status: 'active' })
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

    res.json({ car: serializeCar(car) });
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

    if (car.user.toString() !== String(req.user.id || req.user._id)) {
      return res.status(401).json({
        message: 'Not authorized'
      });
    }

    const imageFiles = getFiles(req, 'images');
    const historyDocFiles = getFiles(req, 'historyDocs');

    const validationError = validateCarPayload({
      body: req.body,
      imageFiles,
      historyDocFiles,
      existingCar: car,
      isUpdate: true
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
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
      'historyDocsVisibility',
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

    if (req.body.historyDocsVisibility !== undefined) {
      car.historyDocsVisibility = normalizeVisibility(req.body.historyDocsVisibility);
    }

    if (req.body.listingType !== undefined) {
      car.listingType = req.body.listingType === 'rent' ? 'rent' : 'sale';
    }

    if (req.body.rentPricePerDay !== undefined) car.rentPricePerDay = numberOrNull(req.body.rentPricePerDay);
    if (req.body.rentPricePerMonth !== undefined) car.rentPricePerMonth = numberOrNull(req.body.rentPricePerMonth);
    if (req.body.rentDeposit !== undefined) car.rentDeposit = numberOrNull(req.body.rentDeposit);

    if (car.listingType !== 'rent') {
      car.rentPricePerDay = null;
      car.rentPricePerMonth = null;
      car.rentDeposit = null;
    }

    let keptImages = car.images || [];

    if (req.body.keptImages) {
      try {
        keptImages = JSON.parse(req.body.keptImages);
      } catch {
        keptImages = car.images || [];
      }
    }

    const newImages = await uploadImages(imageFiles);
    car.images = [...keptImages, ...newImages];

    let keptHistoryDocs = car.historyDocs || [];

    if (req.body.keptHistoryDocs) {
      try {
        keptHistoryDocs = JSON.parse(req.body.keptHistoryDocs);
      } catch {
        keptHistoryDocs = car.historyDocs || [];
      }
    }

    const newHistoryDocs = await uploadHistoryDocs(historyDocFiles);
    car.historyDocs = [...keptHistoryDocs, ...newHistoryDocs].slice(0, 5);

    const updated = await car.save();

    res.json({
      message: 'Car updated successfully',
      car: serializeCar(updated, { owner: true })
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

    if (car.user.toString() !== String(req.user.id || req.user._id)) {
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

    if (req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const alreadyViewed = user.viewedCars.some(id => id.toString() === carId);
      if (alreadyViewed) return res.json({ skipped: true });

      await User.findByIdAndUpdate(req.user.id, { $addToSet: { viewedCars: carId } });
      const car = await Car.findByIdAndUpdate(carId, { $inc: { views: 1 } }, { new: true });
      if (!car) return res.status(404).json({ message: 'Car not found' });
      return res.json({ views: car.views });
    }

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
