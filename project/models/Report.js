const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  postId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:     {
    type: String,
    enum: ['spam', 'misinformation', 'inappropriate', 'harassment', 'other'],
    required: true
  },
  details:    { type: String, maxlength: 300 },
  status:     { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt:  { type: Date, default: Date.now }
});

reportSchema.index({ postId: 1, reporterId: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
