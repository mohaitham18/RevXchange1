const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },

  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },

  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  body: {
    type: String,
    required: true,
    maxlength: 5000,
    trim: true
  },

  imageUrls: {
    type: [String],
    validate: {
      validator: function (arr) {
        return arr.length <= 2;
      },
      message: 'A comment can have a maximum of 2 images'
    }
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date,
    default: null
  },

  isEdited: {
    type: Boolean,
    default: false
  },

  editedAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

commentSchema.index({
  postId: 1,
  parentId: 1,
  createdAt: 1
});

module.exports = mongoose.model('Comment', commentSchema);