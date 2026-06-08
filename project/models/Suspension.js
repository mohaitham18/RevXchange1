const mongoose = require('mongoose');

const suspensionSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:         { type: String, required: true },
  suspendedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  suspendedAt:    { type: Date, default: Date.now },
  suspendedUntil: { type: Date, required: true },
  isActive:       { type: Boolean, default: true }
});

suspensionSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Suspension', suspensionSchema);
