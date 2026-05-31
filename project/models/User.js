const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  savedCars: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car'
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ── Password Hashing Middleware ────────────────────────────────
// Added the 'next' parameter so Mongoose knows when to advance!
userSchema.pre('save', async function(next) {
  // If the password wasn't changed, advance immediately
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // 🔥 CRITICAL: Tells Mongoose the hashing is complete and saves the user record!
    next();
  } catch (err) {
    next(err); // Passes errors safely down the execution chain
  }
});

// ── Password Verification Method ───────────────────────────────
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);