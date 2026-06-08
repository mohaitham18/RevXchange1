const Request = require('../models/Request');
const Car     = require('../models/Car');

// ── Submit an End-User Form Request ───────────────────────────────
const submitRequest = async (req, res) => {
  try {
    const {
      type, carId, name, phone, contact, message,
      offerPrice, rentFrom, rentTo, appointmentDate
    } = req.body;

    if (!['buy', 'rent', 'appointment'].includes(type)) {
      return res.status(400).json({ message: 'Type must be buy, rent, or appointment' });
    }
    if (!carId)         return res.status(400).json({ message: 'Car reference ID is required.' });
    if (!name?.trim())  return res.status(400).json({ message: 'Name field cannot be left blank.' });
    if (!phone?.trim()) return res.status(400).json({ message: 'Phone contact baseline is required.' });

    // Validation 1: Name must contain letters only
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      return res.status(400).json({ message: 'The contact name field must contain only letters.' });
    }

    // Validation 2: Egyptian phone format verification (Exactly 11 digits, starts with 010/011/012/015)
    const phoneDigits = phone.replace(/\D/g, '');
    if (!/^(010|011|012|015)\d{8}$/.test(phoneDigits)) {
      return res.status(400).json({ message: 'Enter a valid 11-digit Egyptian phone number starting with 010, 011, 012, or 015.' });
    }

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'The referenced vehicle could not be found.' });

    // Core Conditionals Mapping
    let finalRentFrom = null;
    let finalRentTo = null;
    let finalAppointmentDate = null;

    if (type === 'rent') {
      if (!rentFrom || !rentTo) {
        return res.status(400).json({ message: 'Rental window schedules are required.' });
      }
      if (new Date(rentFrom) >= new Date(rentTo)) {
        return res.status(400).json({ message: 'The return date must conclude after the vehicle dropoff.' });
      }
      finalRentFrom = rentFrom;
      finalRentTo = rentTo;
    }

    // Process Purchase single-date requirement
    if (type === 'buy') {
      if (!appointmentDate) {
        return res.status(400).json({ message: 'A specific checkout pickup date is required.' });
      }
      finalAppointmentDate = appointmentDate;
    }

    if (type === 'appointment') {
      if (!appointmentDate) {
        return res.status(400).json({ message: 'An inspection appointment schedule date is required.' });
      }
      finalAppointmentDate = appointmentDate;
    }

    const request = await Request.create({
      type,
      car: carId,
      owner: car.user || null, 
      user: req.user?._id || null,
      name: name.trim(),
      phone: phoneDigits,
      contact: contact || 'call',
      message: message?.trim() || '',
      offerPrice: type === 'buy' ? (offerPrice || null) : null,
      rentFrom: finalRentFrom,
      rentTo: finalRentTo,
      appointmentDate: finalAppointmentDate,
      status: 'pending' // Default setup state configuration
    });

    res.status(201).json({ message: 'Your request was dispatched directly to the seller.', request });
  } catch (err) {
    console.error('SUBMIT REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── User: Get My Sent Requests ─────────────────────────────────
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .populate('car', 'brand model year price images rejectionReason status')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error('GET MY REQUESTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Peer-to-Peer: Fetch Direct Inbound Requests ─────────────────
const getIncomingRequests = async (req, res) => {
  try {
    const requests = await Request.find({ owner: req.user._id })
      .populate('car',  'brand model year price images')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error('GET INCOMING REQUESTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Peer-to-Peer: Update Request Status (Accept / Decline) ──────
// Car owner accepts/rejects a request
const ownerUpdateRequest = async (req, res) => {
  try {
    // Accept both 'ownerStatus' and 'status' from frontend
    const ownerStatus = req.body.ownerStatus || req.body.status;
    const ownerNote   = req.body.ownerNote || '';
    const allowed     = ['accepted', 'rejected', 'pending'];

    if (!allowed.includes(ownerStatus)) {
      return res.status(400).json({
        message: `Status must be: ${allowed.join(', ')}`
      });
    }

    const request = await Request.findById(req.params.id)
      .populate('car',  'brand model year user')
      .populate('user', 'name email');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Verify logged-in user owns the car
    if (String(request.car.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.ownerStatus = ownerStatus;
    request.status      = ownerStatus; // keep both in sync
    if (ownerNote) request.ownerNote = ownerNote;
    await request.save();

    // Email the requester
    try {
      const sendMail = require('../utils/sendMail');
      if (request.user?.email && ownerStatus !== 'pending') {
        const carTitle = `${request.car.brand} ${request.car.model} ${request.car.year}`;
        await sendMail({
          to:      request.user.email,
          subject: ownerStatus === 'accepted'
            ? `✅ Your request for ${carTitle} was accepted — RevXChange`
            : `❌ Your request for ${carTitle} was declined — RevXChange`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
              <h2 style="color:${ownerStatus === 'accepted' ? '#27ae60' : '#c0392b'}">
                Request ${ownerStatus === 'accepted' ? 'Accepted ✅' : 'Declined ❌'}
              </h2>
              <p>Hi ${request.user.name},</p>
              <p>Your <strong>${request.type}</strong> request for 
                 <strong>${carTitle}</strong> was <strong>${ownerStatus}</strong>.</p>
              ${ownerNote
                ? `<div style="background:#f5f5f5;padding:12px;border-radius:6px;margin:12px 0">
                     <strong>Note from seller:</strong> ${ownerNote}
                   </div>`
                : ''}
              ${ownerStatus === 'accepted'
                ? `<p>The seller will contact you at <strong>${request.phone}</strong> soon.</p>`
                : '<p>You may submit a new request at a different time.</p>'}
            </div>`
        });
      }
    } catch (mailErr) {
      console.error('Owner request email error:', mailErr.message);
    }

    res.json({ message: `Request ${ownerStatus}`, request });
  } catch (err) {
    console.error('OWNER UPDATE REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: View Global Requests (Strictly Paged at 5 Rows) ────────
const adminGetRequests = async (req, res) => {
  try {
    const { type, status, page = 1 } = req.query;

    const query = {};
    if (type)   query.type   = type;
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = 5; 
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('car',  'brand model year price')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Request.countDocuments(query)
    ]);

    res.json({ 
      requests, 
      total, 
      page: pageNum, 
      pages: Math.ceil(total / limitNum) 
    });
  } catch (err) {
    console.error('ADMIN GET REQUESTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: Update Global Workflow Tracker ──────────────────────
const adminUpdateRequest = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['pending', 'contacted', 'closed', 'accepted', 'rejected'];

    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request line row not found.' });

    if (status)                  request.status    = status;
    if (adminNote !== undefined) request.adminNote = adminNote;

    await request.save();
    res.json({ message: 'Global record updated tracking status successfully.', request });
  } catch (err) {
    console.error('ADMIN UPDATE REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── ADMIN: Delete Request Row Index ─────────────────────────────
const adminDeleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request data target not found.' });

    await request.deleteOne();
    res.json({ message: 'Request index permanent erasure complete.' });
  } catch (err) {
    console.error('ADMIN DELETE REQUEST ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  submitRequest,
  getMyRequests,
  getIncomingRequests,
  ownerUpdateRequest,
  adminGetRequests,
  adminUpdateRequest,
  adminDeleteRequest
};