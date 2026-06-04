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


// PUT /api/posts/:id/vote
router.put('/:id/vote', protect, async (req, res) => {
  try {
    const { value } = req.body;

    if (![1, -1, 0].includes(value)) {
      return res.status(400).json({
        message: 'Vote value must be 1, -1, or 0'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    const existingVote = await Vote.findOne({
      userId: req.user.id,
      postId: post._id
    });

    let upvoteChange = 0;
    let downvoteChange = 0;

    if (!existingVote) {
      if (value === 1) {
        await Vote.create({
          userId: req.user.id,
          postId: post._id,
          value: 1
        });

        upvoteChange = 1;
      }

      if (value === -1) {
        await Vote.create({
          userId: req.user.id,
          postId: post._id,
          value: -1
        });

        downvoteChange = 1;
      }
    } else {
      if (value === 0) {
        if (existingVote.value === 1) {
          upvoteChange = -1;
        }

        if (existingVote.value === -1) {
          downvoteChange = -1;
        }

        await Vote.deleteOne({
          _id: existingVote._id
        });
      } else if (existingVote.value !== value) {
        if (existingVote.value === 1 && value === -1) {
          upvoteChange = -1;
          downvoteChange = 1;
        }

        if (existingVote.value === -1 && value === 1) {
          upvoteChange = 1;
          downvoteChange = -1;
        }

        existingVote.value = value;
        await existingVote.save();
      }
    }

    post.upvotes += upvoteChange;
    post.downvotes += downvoteChange;
    post.score = post.upvotes - post.downvotes;

    if (post.upvotes < 0) post.upvotes = 0;
    if (post.downvotes < 0) post.downvotes = 0;

    post.controversyScore = Math.min(post.upvotes, post.downvotes);

    await post.save();

    res.json({
      success: true,
      postId: post._id,
      userVote: value,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      score: post.score,
      controversyScore: post.controversyScore
    });
  } catch (err) {
    console.error('PUT /api/posts/:id/vote error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── GET /api/posts/:id/comments ──────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const Comment = require('../models/Comment');

    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const allowed = ['top', 'new'];
    const sort = allowed.includes(req.query.sort) ? req.query.sort : 'top';
    const sortObj = sort === 'new' ? { createdAt: -1 } : { createdAt: 1 };

    // Fetch all non-deleted comments for this post in one query
    const allComments = await Comment.find({
      postId: req.params.id,
      isDeleted: false
    })
      .populate('authorId', 'name email')
      .sort(sortObj)
      .lean();

    // Normalize each comment
    const normalized = allComments.map(c => ({
      _id:       c._id,
      postId:    c.postId,
      parentId:  c.parentId || null,
      depth:     c.depth || 0,
      body:      c.body,
      imageUrls: c.imageUrls || [],
      isEdited:  c.isEdited,
      editedAt:  c.editedAt,
      createdAt: c.createdAt,
      author: c.authorId
        ? { _id: c.authorId._id, name: c.authorId.name, email: c.authorId.email }
        : null
    }));

    // Build tree: top-level comments with nested replies
    const map = {};
    const roots = [];

    normalized.forEach(c => { map[c._id.toString()] = { ...c, replies: [] }; });

    normalized.forEach(c => {
      if (c.parentId) {
        const parent = map[c.parentId.toString()];
        if (parent) parent.replies.push(map[c._id.toString()]);
      } else {
        roots.push(map[c._id.toString()]);
      }
    });

    res.json({ success: true, comments: roots, total: allComments.length });
  } catch (err) {
    console.error('GET /api/posts/:id/comments error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/posts/:id/comments ─────────────────────────────
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const Comment = require('../models/Comment');

    const { body, parentId } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    if (body.trim().length > 5000) {
      return res.status(400).json({ message: 'Comment too long (max 5000 chars)' });
    }

    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let depth = 0;
    let resolvedParentId = null;

    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent || parent.isDeleted) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      if (parent.postId.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Parent comment does not belong to this post' });
      }
      depth = Math.min((parent.depth || 0) + 1, 5);
      resolvedParentId = parent._id;
    }

    const comment = await Comment.create({
      postId:   post._id,
      authorId: req.user.id,
      parentId: resolvedParentId,
      depth,
      body:     body.trim()
    });

    // Increment post comment count
    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

    const populated = await Comment.findById(comment._id)
      .populate('authorId', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      comment: {
        _id:       populated._id,
        postId:    populated.postId,
        parentId:  populated.parentId || null,
        depth:     populated.depth,
        body:      populated.body,
        imageUrls: populated.imageUrls || [],
        isEdited:  populated.isEdited,
        createdAt: populated.createdAt,
        replies:   [],
        author: populated.authorId
          ? { _id: populated.authorId._id, name: populated.authorId.name, email: populated.authorId.email }
          : null
      }
    });
  } catch (err) {
    console.error('POST /api/posts/:id/comments error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;