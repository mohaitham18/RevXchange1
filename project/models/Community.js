const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  description: {
    type: String,
    trim: true
  },

  isCentral: {
    type: Boolean,
    default: false
  },

  memberCount: {
    type: Number,
    default: 0
  },

  postCount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

module.exports = mongoose.model('Community', communitySchema);