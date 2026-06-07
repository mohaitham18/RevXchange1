const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['buy', 'rent'],
    required: true
  },

  // The car being requested
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },

  // The user making the request (null if guest)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Contact info (pre-filled from profile, editable)
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  contact: { type: String, enum: ['call', 'whatsapp'], default: 'call' },
  message: { type: String, trim: true, default: '' },

  // Buy-specific
  offerPrice: { type: Number, default: null },

  // Rent-specific
  rentFrom: { type: Date, default: null },
  rentTo:   { type: Date, default: null },

    // Car owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Admin workflow
  status: {
    type: String,
    enum: ['pending', 'contacted', 'closed', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminNote: { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);