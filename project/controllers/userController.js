const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const register = async (req, res) => {
  try {
    const User = require('../models/User');

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      message: 'Registration successful',
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const User = require('../models/User');

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const User = require('../models/User');

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('GET PROFILE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const User = require('../models/User');

    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });

      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const User = require('../models/User');

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

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

const toggleSaveCar = async (req, res) => {
  try {
    const User = require('../models/User');
    const Car = require('../models/Car');

    const carId = req.params.carId;

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!Array.isArray(user.savedCars)) {
      user.savedCars = [];
    }

    const alreadySaved = user.savedCars.some(
      savedId => savedId.toString() === carId
    );

    if (alreadySaved) {
      user.savedCars = user.savedCars.filter(
        savedId => savedId.toString() !== carId
      );

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

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      cars: (user.savedCars || []).filter(Boolean)
    });
  } catch (err) {
    console.error('GET SAVED CARS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getSavedCarIds = async (req, res) => {
  try {
    const User = require('../models/User');

    const user = await User.findById(req.user.id).select('savedCars');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      savedCarIds: (user.savedCars || []).map(id => id.toString())
    });
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