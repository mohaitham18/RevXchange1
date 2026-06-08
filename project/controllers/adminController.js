const Car  = require('../models/Car');
const User = require('../models/User');

// ── Dashboard Overview Metrics ───────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalCars, pendingCars, activeCars, rejectedCars] =
      await Promise.all([
        User.countDocuments(),
        Car.countDocuments(),
        Car.countDocuments({ status: 'pending' }),
        Car.countDocuments({ status: 'active' }),
        Car.countDocuments({ status: 'rejected' })
      ]);

    res.json({ totalUsers, totalCars, pendingCars, activeCars, rejectedCars });
  } catch (err) {
    console.error('ADMIN STATS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get All Users (Strictly Paged at 5 Rows) ─────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = 5; // Hardcoded to exactly 5 rows per page requirement
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
      User.countDocuments(query)
    ]);

    res.json({ 
      users, 
      total, 
      page: pageNum, 
      pages: Math.ceil(total / limitNum) 
    });
  } catch (err) {
    console.error('ADMIN GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get All Cars (Strictly Paged at 5 Rows) ──────────────────────
const adminGetAllCars = async (req, res) => {
  try {
    const { search, status, brand, city, page = 1 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (brand)  query.brand  = new RegExp(`^${brand}$`, 'i');
    if (city)   query.city   = new RegExp(`^${city}$`, 'i');
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ brand: regex }, { model: regex }, { city: regex }];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = 5; // Hardcoded to exactly 5 rows per page requirement
    const skip = (pageNum - 1) * limitNum;

    const [cars, total] = await Promise.all([
      Car.find(query)
         .populate('user', 'name email')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum),
      Car.countDocuments(query)
    ]);

    res.json({ 
      cars, 
      total, 
      page: pageNum, 
      pages: Math.ceil(total / limitNum) 
    });
  } catch (err) {
    console.error('ADMIN GET CARS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Process Rejections & Approvals ──────────────────────────────
// ── Process Rejections & Approvals ──────────────────────────────
const updateCarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const allowed = ['active', 'pending', 'rejected'];

    // 1. Core State Validation
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Status field is required and must be one of: ${allowed.join(', ')}`
      });
    }

    // 2. Strict validation check: block rejections if explanation is missing
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({
        message: 'Please specify an explanation note for this rejection.'
      });
    }

    // 3. Find and Fetch Document Object
    const car = await Car.findById(id).populate('user', 'name email');
    if (!car) {
      return res.status(404).json({ message: 'Car listing not found.' });
    }

    // 4. Mutate State & Apply Explanations
    car.status = status;
    car.rejectionReason = status === 'rejected' ? rejectionReason.trim() : '';

    // 5. Commit Updates onto Database Layer
    await car.save();

    // 6. Outbound Dispatch Mail Service Setup
    try {
      const sendMail = require('../utils/sendMail');
      if (car.user?.email) {
        if (status === 'active') {
          await sendMail({
            to: car.user.email,
            subject: '✅ Your listing was approved — RevXChange',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:auto">
                <h2 style="color:#27ae60">Your car listing was approved!</h2>
                <p>Hi ${car.user.name},</p>
                <p>Great news — your <strong>${car.brand} ${car.model} ${car.year}</strong> listing is now live on RevXChange.</p>
                <a href="${process.env.SITE_URL || 'http://localhost:3000'}/used-cars.html"
                   style="display:inline-block;margin-top:12px;padding:10px 20px;background:#27ae60;color:#fff;border-radius:8px;text-decoration:none">
                  View Your Listing
                </a>
              </div>`
          });
        } else if (status === 'rejected') {
          await sendMail({
            to: car.user.email,
            subject: '❌ Your listing was not approved — RevXChange',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:auto">
                <h2 style="color:#c0392b">Your listing was not approved</h2>
                <p>Hi ${car.user.name},</p>
                <p>Unfortunately, your <strong>${car.brand} ${car.model} ${car.year}</strong> listing was rejected.</p>
                <div style="background:#fff5f5;border-left:4px solid #c0392b;padding:12px 16px;margin:16px 0;border-radius:4px">
                  <strong>Reason for Rejection:</strong> ${car.rejectionReason}
                </div>
                <p>Please fix the issue and resubmit your listing.</p>
              </div>`
          });
        }
      }
    } catch (mailErr) {
      console.error('Email notification error:', mailErr.message);
    }

    // Return uniform JSON data profiles smoothly
    return res.status(200).json({ success: true, message: `Car status updated to "${status}"`, car });

  } catch (err) {
    console.error('ADMIN UPDATE CAR STATUS ERROR:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// ── Admin Delete Any Car ───────────────────────────────────────
const adminDeleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    await car.deleteOne();
    res.json({ message: 'Car deleted by admin' });
  } catch (err) {
    console.error('ADMIN DELETE CAR ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Change User Role ───────────────────────────────────────────
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['user', 'admin'];

    if (!allowed.includes(role)) {
      return res.status(400).json({
        message: `Role must be one of: ${allowed.join(', ')}`
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({
      message: `User role updated to "${role}"`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('ADMIN CHANGE ROLE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Admin Delete User ──────────────────────────────────────────
const adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Car.deleteMany({ user: req.params.id });
    await user.deleteOne();

    res.json({ message: 'User and all their listings deleted' });
  } catch (err) {
    console.error('ADMIN DELETE USER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  adminGetAllCars,
  updateCarStatus,
  adminDeleteCar,
  changeUserRole,
  adminDeleteUser
};