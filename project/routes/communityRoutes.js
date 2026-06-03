const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const protect             = require('../middleware/auth');
const Community           = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');
const Brand               = require('../models/Brand');

// Optional auth: sets req.user.id if a valid token is present, never blocks
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    }
  } catch {
    // Invalid / expired token — treat as unauthenticated
  }
  next();
};

// ── GET /api/communities ─────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('brandId', 'name slug logoUrl glowColor')
      .sort({ memberCount: -1 })
      .lean();

    if (req.user) {
      const memberships = await CommunityMembership.find({ userId: req.user.id })
        .select('communityId')
        .lean();
      const joinedSet = new Set(memberships.map(m => m.communityId.toString()));
      communities.forEach(c => { c.joined = joinedSet.has(c._id.toString()); });
    } else {
      communities.forEach(c => { c.joined = false; });
    }

    res.json({ communities });
  } catch (err) {
    console.error('GET /api/communities error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/communities/:id/join ───────────────────────────────
router.post('/:id/join', protect, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    const membership = await CommunityMembership.create({
      userId:      req.user.id,
      communityId: req.params.id,
      variantId:   req.body.variantId || null
    });

    await Community.findByIdAndUpdate(req.params.id, { $inc: { memberCount: 1 } });

    res.status(201).json({ success: true, membership });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Already a member' });
    }
    console.error('POST /api/communities/:id/join error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/communities/:id/leave ────────────────────────────
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const membership = await CommunityMembership.findOneAndDelete({
      userId:      req.user.id,
      communityId: req.params.id
    });
    if (!membership) return res.status(404).json({ message: 'Not a member' });

    // Decrement only if count > 0 — atomic floor guard
    await Community.findOneAndUpdate(
      { _id: req.params.id, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/communities/:id/leave error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/communities/:id/variant ───────────────────────────
router.patch('/:id/variant', protect, async (req, res) => {
  try {
    const membership = await CommunityMembership.findOneAndUpdate(
      { userId: req.user.id, communityId: req.params.id },
      { variantId: req.body.variantId },
      { new: true }
    );
    if (!membership) return res.status(403).json({ message: 'Must be a member to set a variant' });

    res.json({ success: true, membership });
  } catch (err) {
    console.error('PATCH /api/communities/:id/variant error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/communities/:slug/posts ─────────────────────────
router.get('/:slug/posts', optionalAuth, async (req, res) => {
  try {
    const Post = require('../models/Post');

    const community = await Community.findOne({ slug: req.params.slug })
      .populate('brandId', 'name slug logoUrl glowColor')
      .lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const allowed = ['top', 'new', 'hot', 'controversial'];
    const sort  = allowed.includes(req.query.sort) ? req.query.sort : 'top';
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 12;
    const skip  = (page - 1) * limit;

    const sortMap = {
      top:           { score: -1, createdAt: -1 },
      new:           { createdAt: -1 },
      hot:           { hotScore: -1, createdAt: -1 },
      controversial: { controversyScore: -1, createdAt: -1 }
    };

    const filter = { communityId: community._id, isDeleted: false };
    const total  = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate('authorId', 'name email')
      .populate({
        path: 'communityId',
        select: 'name slug isCentral memberCount postCount brandId',
        populate: { path: 'brandId', select: 'name slug logoUrl glowColor' }
      })
      .populate('variantId', 'label yearStart yearEnd order')
      .sort(sortMap[sort])
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = posts.map(p => ({
      ...p,
      author:    p.authorId || null,
      community: p.communityId
        ? { ...p.communityId, brand: p.communityId.brandId || null }
        : null,
      variant: p.variantId || null
    }));

    res.json({
      posts: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      sort,
      source: 'community'
    });
  } catch (err) {
    console.error('GET /api/communities/:slug/posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
