const Request = require('../models/Request');
const Car     = require('../models/Car');

// ── Submit a Request (user-facing) ────────────────────────────
const submitRequest = async (req, res) => {
  try {
    const { type, carId, name, phone, contact, message, offerPrice, rentFrom, rentTo } = req.body;

    // Validations
    if (!['buy', 'rent'].includes(type)) {
      return res.status(400).json({ message: 'Type must be buy or rent' });
    }
    if (!carId)  return res.status(400).json({ message: 'Car is required' });
    if (!name?.trim())  return res.status(400).json({ message: 'Name is required' });
    if (!phone?.trim()) return res.status(400).json({ message: 'Phone is required' });

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    if (type === 'rent') {
      if (!rentFrom || !rentTo) {
        return res.status(400).json({ message: 'Rent dates are required' });
      }
      if (new Date(rentFrom) >= new Date(rentTo)) {
        return res.status(400).json({ message: 'Return date must be after pickup date' });
      }
    }

    const request = await Request.create({
      type,
      car:        carId,
      user:       req.user?._id || null,
      name:       name.trim(),
      phone:      phone.trim(),
      contact:    contact || 'call',
      message:    message?.trim() || '',
      offerPrice: type === 'buy'  ? (offerPrice || null) : null,
      rentFrom:   type === 'rent' ? rentFrom : null,
      rentTo:     type === 'rent' ? rentTo   : null,
    });

    res.status(201).json({ message: 'Request submitted successfully', request });
  } catch (err) {
    console.error('SUBMIT REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get My Requests (logged-in user) ──────────────────────────
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .populate('car', 'brand model year price images')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error('GET MY REQUESTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: Get All Requests ────────────────────────────────────
const adminGetRequests = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (type)   query.type   = type;
    if (status) query.status = status;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      Request.find(query)
             .populate('car',  'brand model year price')
             .populate('user', 'name email')
             .sort({ createdAt: -1 })
             .skip(skip)
             .limit(limitNum),
      Request.countDocuments(query)
    ]);

    res.json({ requests, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('ADMIN GET REQUESTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: Update Request Status ───────────────────────────────
const adminUpdateRequest = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['pending', 'contacted', 'closed'];

    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (status)    request.status    = status;
    if (adminNote !== undefined) request.adminNote = adminNote;

    await request.save();
    res.json({ message: 'Request updated', request });
  } catch (err) {
    console.error('ADMIN UPDATE REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: Delete Request ──────────────────────────────────────
const adminDeleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await request.deleteOne();
    res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error('ADMIN DELETE REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  submitRequest,
  getMyRequests,
  adminGetRequests,
  adminUpdateRequest,
  adminDeleteRequest
};