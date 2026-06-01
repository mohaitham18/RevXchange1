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

module.exports = router;
