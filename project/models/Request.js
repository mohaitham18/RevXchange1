const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['buy', 'rent', 'appointment'],
    required: true
  },

  // The car asset being requested
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },

  // The authenticated user submitting the request (null if an unauthenticated guest)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Direct contact information (pre-filled from user profile layers)
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  contact: { type: String, enum: ['call', 'whatsapp'], default: 'call' },
  message: { type: String, trim: true, default: '' },

  // Buy-specific & Appointment-specific unified single-date records
  offerPrice:      { type: Number, default: null },
  appointmentDate: { type: Date, default: null },

  // Rent-specific date tracking parameters
  rentFrom: { type: Date, default: null },
  rentTo:   { type: Date, default: null },

  // The corresponding publishing merchant account
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Peer-to-Peer negotiation status (Direct User-to-User workspace flow)
  ownerStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  ownerNote: { type: String, default: '' },

  // Admin workflow tracker records
  status: {
    type: String,
    enum: ['pending', 'contacted', 'closed', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminNote: { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);