const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  variantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'CarVariant', default: null },
  joinedAt:    { type: Date, default: Date.now }
});

membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityMembership', membershipSchema);