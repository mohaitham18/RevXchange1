const express = require('express');

const router = express.Router();

const protect = require('../middleware/auth');

const Post = require('../models/Post');
const Vote = require('../models/Vote');
const Community = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');

// POST /api/posts
router.post('/', protect, async (req, res) => {
  try {
    const { communityId, title, body, variantId } = req.body;

    if (!communityId) {
      return res.status(400).json({
        message: 'communityId is required'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Title is required'
      });
    }

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    const membership = await CommunityMembership.findOne({
      userId: req.user.id,
      communityId
    });

    if (!membership) {
      return res.status(403).json({
        message: 'You must join this community before posting'
      });
    }

    const newPost = await Post.create({
      communityId,
      authorId: req.user.id,
      variantId: variantId || null,
      title: title.trim(),
      body: body || '',
      upvotes: 1,
      downvotes: 0,
      score: 1,
      hotScore: 0,
      controversyScore: 0
    });

    await Vote.create({
      userId: req.user.id,
      postId: newPost._id,
      value: 1
    });

    await Community.findByIdAndUpdate(communityId, {
      $inc: {
        postCount: 1
      }
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('authorId', 'name email')
      .populate({
        path: 'communityId',
        select: 'name slug isCentral memberCount postCount brandId',
        populate: {
          path: 'brandId',
          select: 'name slug logoUrl glowColor'
        }
      })
      .populate('variantId', 'label yearStart yearEnd')
      .lean();

    res.status(201).json({
      success: true,
      post: populatedPost
    });
  } catch (err) {
    console.error('POST /api/posts error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// PATCH /api/posts/:id — edit post (author only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const { title, body } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.isDeleted) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your post' });
    }

    if (title) post.title = title.trim();
    if (body !== undefined) post.body = body;
    post.isEdited  = true;
    post.editedAt  = new Date();
    post.updatedAt = new Date();

    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    console.error('PATCH /api/posts/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/posts/:id — soft delete (author only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your post' });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    await Community.findByIdAndUpdate(post.communityId, {
      $inc: { postCount: -1 }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;