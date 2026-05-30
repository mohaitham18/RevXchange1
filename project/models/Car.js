const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  price: { type: Number, required: true },
  mileage: { type: Number, required: true },
  city: { type: String, required: true, trim: true },
  condition: { type: String, enum: ['new', 'used'], default: 'used' },
  transmission: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  fuel: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid', 'gas', 'natural gas'], default: 'petrol' },
  color: { type: String, trim: true },
  fabrika: { type: Boolean, default: false },
  description: { type: String, trim: true },
  images: [{ type: String }],
  status: { type: String, enum: ['active', 'pending', 'sold'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);