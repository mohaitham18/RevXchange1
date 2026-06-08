const express        = require('express');
const jwt            = require('jsonwebtoken');
const cloudinary     = require('cloudinary').v2;
const router         = express.Router();

const User            = require('../models/User');
const Post            = require('../models/Post');
const Comment         = require('../models/Comment');
const Community       = require('../models/Community');
const CommunityRequest= require('../models/CommunityRequest');
const Brand           = require('../models/Brand');
const Report          = require('../models/Report');
const Suspension      = require('../models/Suspension');
const SystemSettings  = require('../models/SystemSettings');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Inline admin guard ────────────────────────────────────────
async function adminProtect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized' });
  }
}

router.use(adminProtect);

// ── Helper: validate admin passwords ─────────────────────────
function getValidPasswords() {
  return [
    process.env.ADMIN_PASS_1,
    process.env.ADMIN_PASS_2,
    process.env.ADMIN_PASS_3,
    process.env.ADMIN_PASS_4
  ].filter(Boolean);
}

const PAGE_SIZE = 20;

// ════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════

// GET /api/admin/reports?status=pending&page=1
router.get('/reports', async (req, res) => {
  try {
    const status = ['pending', 'reviewed', 'dismissed'].includes(req.query.status)
      ? req.query.status : 'pending';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [reports, total] = await Promise.all([
      Report.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate({
          path: 'postId',
          select: 'title body authorId communityId isDeleted',
          populate: [
            { path: 'authorId',    select: 'name' },
            { path: 'communityId', select: 'name' }
          ]
        })
        .populate('reporterId', 'name')
        .lean(),
      Report.countDocuments({ status })
    ]);

    res.json({ reports, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error('GET /admin/reports error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/reports/:id/dismiss
router.patch('/reports/:id/dismiss', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status     = 'dismissed';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /admin/reports/:id/dismiss error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/reports/:id/delete-post
router.delete('/reports/:id/delete-post', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.postId) await Post.findByIdAndUpdate(report.postId, { isDeleted: true });
    report.status     = 'reviewed';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/reports/:id/delete-post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users/:userId/suspend
router.post('/users/:userId/suspend', async (req, res) => {
  try {
    const { reason, durationDays, reportId } = req.body;
    const validDurations = [1, 3, 7, 14, 30];
    if (!reason?.trim()) return res.status(400).json({ message: 'Reason is required' });
    if (!validDurations.includes(Number(durationDays))) {
      return res.status(400).json({ message: 'Invalid duration. Must be 1, 3, 7, 14, or 30 days' });
    }
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + Number(durationDays));

    await Suspension.create({
      userId:         req.params.userId,
      reason:         reason.trim(),
      suspendedBy:    req.user.id,
      suspendedUntil,
      isActive:       true
    });

    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'reviewed', reviewedBy: req.user.id, reviewedAt: new Date()
      });
    }
    res.json({ success: true, suspendedUntil });
  } catch (err) {
    console.error('POST /admin/users/:userId/suspend error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY STATS
// ════════════════════════════════════════════════════════════

// GET /api/admin/community-stats
router.get('/community-stats', async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalCommunities,
      totalPosts,
      totalComments,
      memberSum,
      postsToday,
      postsThisWeek,
      topCommunities,
      pendingReports,
      pendingSuggestions,
      settings
    ] = await Promise.all([
      Community.countDocuments(),
      Post.countDocuments({ isDeleted: false }),
      Comment.countDocuments({ isDeleted: false }),
      Community.aggregate([{ $group: { _id: null, total: { $sum: '$memberCount' } } }]),
      Post.countDocuments({ isDeleted: false, createdAt: { $gte: todayStart } }),
      Post.countDocuments({ isDeleted: false, createdAt: { $gte: weekStart } }),
      Community.find({}).sort({ postCount: -1 }).limit(5)
        .select('name memberCount postCount').lean(),
      Report.countDocuments({ status: 'pending' }),
      CommunityRequest.countDocuments({ status: 'pending' }),
      SystemSettings.get()
    ]);

    res.json({
      totalCommunities,
      totalPosts,
      totalComments,
      totalMembers:      memberSum[0]?.total || 0,
      postsToday,
      postsThisWeek,
      topCommunities,
      pendingReports,
      pendingSuggestions,
      maintenanceMode:   settings.maintenanceMode
    });
  } catch (err) {
    console.error('GET /admin/community-stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY SUGGESTIONS
// ════════════════════════════════════════════════════════════

// GET /api/admin/community-suggestions?status=pending&page=1
router.get('/community-suggestions', async (req, res) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status : 'pending';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [suggestions, total] = await Promise.all([
      CommunityRequest.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate('brandId', 'name slug')
        .populate('userId', 'name')
        .lean(),
      CommunityRequest.countDocuments({ status })
    ]);

    res.json({ suggestions, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error('GET /admin/community-suggestions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/community-suggestions/:id
router.patch('/community-suggestions/:id', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const suggestion = await CommunityRequest.findById(req.params.id)
      .populate('brandId', 'name slug');
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    suggestion.status    = status;
    suggestion.adminNote = adminNote || null;
    await suggestion.save();

    let newCommunity = null;
    if (status === 'approved') {
      const brandName  = suggestion.brandId?.slug || 'brand';
      const modelSlug  = suggestion.model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const yearPart   = suggestion.yearStart ? `-${suggestion.yearStart}` : '';
      let   baseSlug   = `${brandName}-${modelSlug}${yearPart}`;
      let   slug       = baseSlug;
      let   attempt    = 0;

      while (await Community.findOne({ slug })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const yearLabel = suggestion.yearStart
        ? (suggestion.yearEnd && suggestion.yearEnd !== suggestion.yearStart
            ? ` ${suggestion.yearStart}–${suggestion.yearEnd}`
            : ` ${suggestion.yearStart}`)
        : '';

      newCommunity = await Community.create({
        brandId:     suggestion.brandId._id,
        name:        `${suggestion.model}${yearLabel}`,
        slug,
        description: suggestion.details || '',
        createdBy:   req.user.id
      });
    }

    res.json({ success: true, newCommunity });
  } catch (err) {
    console.error('PATCH /admin/community-suggestions/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// MAINTENANCE MODE
// ════════════════════════════════════════════════════════════

// POST /api/admin/maintenance/toggle
router.post('/maintenance/toggle', async (req, res) => {
  try {
    const { password, durationMinutes, message } = req.body;
    const validPasswords = getValidPasswords();

    if (!validPasswords.includes(password)) {
      return res.status(403).json({ message: 'Invalid admin password' });
    }

    const settings = await SystemSettings.get();
    const now      = new Date();

    if (settings.maintenanceMode?.active) {
      await SystemSettings.set({
        'maintenanceMode.active':  false,
        'maintenanceMode.endsAt':  null
      });
      return res.json({ active: false, message: 'Maintenance mode deactivated' });
    }

    const mins   = Math.max(1, parseInt(durationMinutes) || 30);
    const endsAt = new Date(now.getTime() + mins * 60000);

    await SystemSettings.set({
      'maintenanceMode.active':      true,
      'maintenanceMode.message':     message?.trim() || 'Scheduled maintenance in progress',
      'maintenanceMode.activatedBy': req.user.name || String(req.user._id),
      'maintenanceMode.activatedAt': now,
      'maintenanceMode.endsAt':      endsAt
    });

    res.json({ active: true, endsAt, message: 'Maintenance mode activated' });
  } catch (err) {
    console.error('POST /admin/maintenance/toggle error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY RESET
// ════════════════════════════════════════════════════════════

// POST /api/admin/community/:id/reset
router.post('/community/:id/reset', async (req, res) => {
  try {
    const { passwords } = req.body;
    if (!Array.isArray(passwords)) {
      return res.status(400).json({ message: 'passwords array required' });
    }

    const validPasswords  = getValidPasswords();
    const uniqueValid     = [...new Set(passwords.filter(p => validPasswords.includes(p)))];
    if (uniqueValid.length < 2) {
      return res.status(403).json({ message: 'Two distinct valid admin passwords required' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    const posts   = await Post.find({ communityId: req.params.id }).lean();
    const postIds = posts.map(p => p._id);

    // Destroy Cloudinary assets (best-effort)
    for (const post of posts) {
      try {
        for (const url of (post.imageUrls || [])) {
          const m = url.match(/revxchange\/posts\/([^.?]+)/);
          if (m) await cloudinary.uploader.destroy('revxchange/posts/' + m[1]);
        }
        if (post.videoUrl) {
          const vm = post.videoUrl.match(/revxchange\/videos\/([^.?]+)/);
          if (vm) await cloudinary.uploader.destroy('revxchange/videos/' + vm[1], { resource_type: 'video' });
        }
      } catch {}
    }

    const now           = new Date();
    const postResult    = await Post.updateMany(
      { communityId: req.params.id },
      { isDeleted: true, deletedAt: now }
    );
    const commentResult = await Comment.deleteMany({ postId: { $in: postIds } });

    await Community.findByIdAndUpdate(req.params.id, { postCount: 0 });

    res.json({
      success:        true,
      deletedPosts:   postResult.modifiedCount,
      deletedComments: commentResult.deletedCount
    });
  } catch (err) {
    console.error('POST /admin/community/:id/reset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// NUCLEAR RESET
// ════════════════════════════════════════════════════════════

// POST /api/admin/nuclear-reset
router.post('/nuclear-reset', async (req, res) => {
  try {
    const { passwords } = req.body;
    if (!Array.isArray(passwords)) {
      return res.status(400).json({ message: 'passwords array required' });
    }

    const requiredPasswords = getValidPasswords();
    const providedSet       = new Set(passwords);
    const allMatch          = requiredPasswords.every(p => providedSet.has(p));

    if (!allMatch || requiredPasswords.length < 4) {
      return res.status(403).json({ message: 'All 4 admin passwords required for nuclear reset' });
    }

    const now           = new Date();
    const postResult    = await Post.updateMany({}, { isDeleted: true, deletedAt: now });
    const commentResult = await Comment.deleteMany({});
    await Community.updateMany({}, { postCount: 0 });

    // Bulk Cloudinary purge (best-effort)
    try {
      await cloudinary.api.delete_resources_by_prefix('revxchange/posts');
    } catch {}
    try {
      await cloudinary.api.delete_resources_by_prefix('revxchange/comments');
    } catch {}

    res.json({
      success:         true,
      message:         'Nuclear reset complete',
      deletedPosts:    postResult.modifiedCount,
      deletedComments: commentResult.deletedCount
    });
  } catch (err) {
    console.error('POST /admin/nuclear-reset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
