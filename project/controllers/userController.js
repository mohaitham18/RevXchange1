const jwt = require('jsonwebtoken');

// ── Token & Data Formatters ────────────────────────────────────
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const cleanEmail = (email) => String(email || '').trim().toLowerCase();

const getAdminEmails = () => {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => cleanEmail(email))
    .filter(Boolean);
};

const getRoleForEmail = (email) => {
  const normalizedEmail = cleanEmail(email);
  const adminEmails = getAdminEmails();
  return adminEmails.includes(normalizedEmail) ? 'admin' : 'user';
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

// ── Auth Operations ────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const User = require('../models/User');

    const name = String(req.body.name || '').trim();
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const role = getRoleForEmail(email);

    const user = await User.create({ name, email, password, role });

    // Send welcome email (non-blocking)
    try {
      const sendMail = require('../utils/mailer');
      sendMail({
        to: user.email,
        subject: 'Welcome to RevXChange! 🚗',
        html: `
          <div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#5a0f1c;padding:28px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="color:#fff;margin:0">RevXChange</h1>
            </div>
            <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px">
              <h2 style="color:#1a1a1a">Welcome, ${user.name}! 👋</h2>
              <p style="color:#555;line-height:1.7">Your account has been created successfully. You can now buy, sell and rent cars across Egypt.</p>
              <a href="${process.env.APP_URL || ''}/used-cars.html" style="display:inline-block;margin-top:16px;background:#5a0f1c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Browse Cars</a>
            </div>
          </div>
        `
      }).catch(mailErr => console.error('Welcome email failed:', mailErr.message));
    } catch (mailErr) {
      console.error('Welcome email failed:', mailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful',
      token: generateToken(user._id, user.role),
      user: publicUser(user)
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const User = require('../models/User');

    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const correctRole = getRoleForEmail(user.email);
    if (user.role !== correctRole) {
      user.role = correctRole;
      await user.save();
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id, user.role),
      user: publicUser(user)
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Profile Management ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('GET PROFILE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const User = require('../models/User');
    const name = String(req.body.name || '').trim();
    const email = cleanEmail(req.body.email);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
      user.role = getRoleForEmail(email);
    }

    if (name) user.name = name;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: publicUser(user)
    });
  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const User = require('../models/User');
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('CHANGE PASSWORD ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Saved Listings Collections ─────────────────────────────────
const toggleSaveCar = async (req, res) => {
  try {
    const User = require('../models/User');
    const Car = require('../models/Car');
    const carId = req.params.carId;

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!Array.isArray(user.savedCars)) user.savedCars = [];

    const alreadySaved = user.savedCars.some(savedId => savedId.toString() === carId);

    if (alreadySaved) {
      user.savedCars = user.savedCars.filter(savedId => savedId.toString() !== carId);
      await user.save();
      return res.json({
        message: 'Car removed from saved ads',
        saved: false,
        savedCarIds: user.savedCars.map(id => id.toString())
      });
    }

    user.savedCars.push(carId);
    await user.save();

    res.json({
      message: 'Car saved successfully',
      saved: true,
      savedCarIds: user.savedCars.map(id => id.toString())
    });
  } catch (err) {
    console.error('TOGGLE SAVE CAR ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getSavedCars = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).populate({
      path: 'savedCars',
      match: { status: 'active' },
      options: { sort: { createdAt: -1 } }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ cars: (user.savedCars || []).filter(Boolean) });
  } catch (err) {
    console.error('GET SAVED CARS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getSavedCarIds = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('savedCars');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ savedCarIds: (user.savedCars || []).map(id => id.toString()) });
  } catch (err) {
    console.error('GET SAVED IDS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  toggleSaveCar,
  getSavedCars,
  getSavedCarIds
};