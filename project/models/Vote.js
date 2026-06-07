const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },

  value: {
    type: Number,
    required: true,
    enum: [1, -1]
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

voteSchema.index(
  { userId: 1, postId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Vote', voteSchema);