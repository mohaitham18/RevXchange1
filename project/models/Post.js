const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  communityId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  authorId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'CarVariant', default: null },

  title:            { type: String, required: true, maxlength: 300 },
  body:             { type: String, maxlength: 10000 },
  imageUrls:        { type: [String], validate: v => v.length <= 5 },
  videoUrl:         { type: String, default: null },
  videoExpiresAt:   { type: Date, default: null },

  isShare:          { type: Boolean, default: false },
  sharedPostId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  shareCommentary:  { type: String, default: null },

  upvotes:          { type: Number, default: 1 },
  downvotes:        { type: Number, default: 0 },
  score:            { type: Number, default: 1 },
  hotScore:         { type: Number, default: 0 },
  controversyScore: { type: Number, default: 0 },

  commentCount:     { type: Number, default: 0 },

  isDeleted:        { type: Boolean, default: false },
  deletedAt:        { type: Date, default: null },
  isEdited:         { type: Boolean, default: false },
  editedAt:         { type: Date, default: null },

  createdAt:        { type: Date, default: Date.now },
  updatedAt:        { type: Date, default: Date.now }
});

postSchema.index({ communityId: 1, score: -1 });
postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ communityId: 1, hotScore: -1 });
postSchema.index({ communityId: 1, controversyScore: -1 });
postSchema.index({ videoExpiresAt: 1 });

module.exports = mongoose.model('Post', postSchema);