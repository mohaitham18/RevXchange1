const mongoose = require('mongoose');

const carVariantSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },

  label: {
    type: String,
    required: true,
    trim: true
  },

  yearStart: {
    type: Number,
    required: true
  },

  yearEnd: {
    type: Number,
    required: true
  },

  order: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('CarVariant', carVariantSchema);