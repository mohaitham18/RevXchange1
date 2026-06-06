const Car  = require('../models/Car');
const User = require('../models/User');

// ── Dashboard Stats ────────────────────────────────────────────
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

// ── Get All Users ──────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;

    const query = {};
    if (role)   query.role = role;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
      User.countDocuments(query)
    ]);

    res.json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('ADMIN GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get All Cars (admin sees ALL statuses) ─────────────────────
const adminGetAllCars = async (req, res) => {
  try {
    const { search, status, brand, city, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (brand)  query.brand  = new RegExp(`^${brand}$`, 'i');
    if (city)   query.city   = new RegExp(`^${city}$`, 'i');
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ brand: regex }, { model: regex }, { city: regex }];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [cars, total] = await Promise.all([
      Car.find(query)
         .populate('user', 'name email')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum),
      Car.countDocuments(query)
    ]);

    res.json({ cars, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('ADMIN GET CARS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Approve / Reject / Re-activate Car ────────────────────────
const updateCarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'pending', 'rejected'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${allowed.join(', ')}`
      });
    }

    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    car.status = status;
    await car.save();

    res.json({ message: `Car status updated to "${status}"`, car });
  } catch (err) {
    console.error('ADMIN UPDATE CAR STATUS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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

    // req.user is the full object from your protect middleware
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