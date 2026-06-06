const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },

  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CarVariant',
    default: null
  },

  title: {
    type: String,
    required: true,
    maxlength: 300,
    trim: true
  },

  body: {
    type: String,
    maxlength: 10000,
    trim: true
  },

  imageUrls: {
    type: [String],
    validate: {
      validator: function (arr) {
        return arr.length <= 5;
      },
      message: 'A post can have a maximum of 5 images'
    }
  },

  videoUrl: {
    type: String,
    default: null
  },

  videoExpiresAt: {
    type: Date,
    default: null
  },

  isShare: {
    type: Boolean,
    default: false
  },

  sharedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },

  shareCommentary: {
    type: String,
    default: null
  },

  upvotes: {
    type: Number,
    default: 1
  },

  downvotes: {
    type: Number,
    default: 0
  },

  score: {
    type: Number,
    default: 1
  },

  hotScore: {
    type: Number,
    default: 0
  },

  controversyScore: {
    type: Number,
    default: 0
  },

  commentCount: {
    type: Number,
    default: 0
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
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

postSchema.index({ communityId: 1, score: -1 });
postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ communityId: 1, hotScore: -1 });
postSchema.index({ communityId: 1, controversyScore: -1 });
postSchema.index({ videoExpiresAt: 1 });

module.exports = mongoose.model('Post', postSchema);