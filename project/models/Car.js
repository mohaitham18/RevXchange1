const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  brand: {
    type: String,
    required: true,
    trim: true
  },

  model: {
    type: String,
    required: true,
    trim: true
  },

  year: {
    type: Number,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  listingType: {
    type: String,
    enum: ['sale', 'rent'],
    default: 'sale'
  },

  rentPricePerDay: {
    type: Number,
    default: null
  },

  rentPricePerMonth: {
    type: Number,
    default: null
  },

  rentDeposit: {
    type: Number,
    default: null
  },

  mileage: {
    type: Number,
    required: true
  },

  city: {
    type: String,
    required: true,
    trim: true
  },

  condition: {
    type: String,
    enum: ['new', 'used'],
    default: 'used'
  },

  transmission: {
    type: String,
    enum: ['automatic', 'manual'],
    default: 'automatic'
  },

  fuel: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid', 'gas', 'natural gas'],
    default: 'petrol'
  },

  color: {
    type: String,
    trim: true,
    default: 'Not specified'
  },

  description: {
    type: String,
    trim: true
  },

  phone: {
    type: String,
    trim: true,
    default: ''
  },

  fabrika: {
    type: Boolean,
    default: false
  },

  body: {
    type: String,
    trim: true,
    default: 'Sedan'
  },

  drivetrain: {
    type: String,
    trim: true,
    default: 'FWD'
  },

  doors: {
    type: Number,
    default: 4
  },

  seats: {
    type: Number,
    default: 5
  },

  engine: {
    type: String,
    trim: true,
    default: 'Not specified'
  },

  owners: {
    type: String,
    trim: true,
    default: 'Not specified'
  },

  service: {
    type: String,
    trim: true,
    default: 'Not specified'
  },

  highlights: [
    {
      type: String,
      trim: true
    }
  ],

  included: [
    {
      type: String,
      trim: true
    }
  ],

  images: [
    {
      type: String
    }
  ],

  views: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['active', 'pending', 'rejected'],
    default: 'pending'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Car', carSchema);