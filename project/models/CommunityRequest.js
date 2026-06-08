const mongoose = require('mongoose');

const communityRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },

  model: {
    type: String,
    required: true,
    trim: true
  },

  yearStart: {
    type: Number,
    default: null
  },

  yearEnd: {
    type: Number,
    default: null
  },

  details: {
    type: String,
    maxlength: 500,
    trim: true,
    default: null
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  adminNote: {
    type: String,
    trim: true,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CommunityRequest', communityRequestSchema);
