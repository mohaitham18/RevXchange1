const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');

const router = express.Router();

const protect = require('../middleware/auth');

const Post = require('../models/Post');
const Vote = require('../models/Vote');
const Community = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');
const Comment = require('../models/Comment');

// ── Cloudinary config ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Helpers ───────────────────────────────────────────────────
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ''));
}

async function getOptionalUserId(req) {
  try {
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      return decoded.id;
    }
  } catch {
    return null;
  }

  return null;
}

// ── Multer — images 5MB each ─────────────────────────────────
const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ── Multer — video 25MB ───────────────────────────────────────
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  }
});

// ── Upload image buffer to Cloudinary ─────────────────────────
async function uploadImage(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

// ── Upload video buffer to Cloudinary ─────────────────────────
async function uploadVideoFile(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        eager: [{ streaming_profile: 'auto', format: 'm3u8' }],
        eager_async: true
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

/* ============================================================
   IMPORTANT STATIC ROUTES FIRST
   /my-posts must be BEFORE /:id
   ============================================================ */

// ── GET /api/posts/my-posts ───────────────────────────────────
router.get('/my-posts', protect, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = {
      authorId: req.user.id,
      isDeleted: false
    };

    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate({
        path: 'communityId',
        select: 'name slug isCentral brandId memberCount postCount',
        populate: {
          path: 'brandId',
          select: 'name slug logoUrl glowColor'
        }
      })
      .populate('variantId', 'label yearStart yearEnd order')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = posts.map(p => ({
      _id: p._id,

      title: p.title,
      body: p.body,
      imageUrls: p.imageUrls || [],
      videoUrl: p.videoUrl || null,
      videoExpiresAt: p.videoExpiresAt || null,

      isShare: p.isShare || false,
      sharedPostId: p.sharedPostId || null,
      shareCommentary: p.shareCommentary || null,

      upvotes: p.upvotes || 0,
      downvotes: p.downvotes || 0,
      score: p.score || 0,
      hotScore: p.hotScore || 0,
      controversyScore: p.controversyScore || 0,
      commentCount: p.commentCount || 0,

      isEdited: p.isEdited || false,
      editedAt: p.editedAt || null,

      createdAt: p.createdAt,
      updatedAt: p.updatedAt,

      community: p.communityId
        ? {
            _id: p.communityId._id,
            name: p.communityId.name,
            slug: p.communityId.slug,
            isCentral: p.communityId.isCentral,
            memberCount: p.communityId.memberCount,
            postCount: p.communityId.postCount,
            brand: p.communityId.brandId || null
          }
        : null,

      variant: p.variantId
        ? {
            _id: p.variantId._id,
            label: p.variantId.label,
            yearStart: p.variantId.yearStart,
            yearEnd: p.variantId.yearEnd,
            order: p.variantId.order
          }
        : null
    }));

    res.json({
      success: true,
      posts: formatted,
      page,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total
    });
  } catch (err) {
    console.error('GET /api/posts/my-posts error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/* ============================================================
   POSTS
   ============================================================ */

// ── POST /api/posts ───────────────────────────────────────────
router.post('/', protect, uploadImages.array('images', 5), async (req, res) => {
  try {
    const { communityId, title, body, variantId } = req.body;

    if (!communityId || !isValidObjectId(communityId)) {
      return res.status(400).json({
        message: 'Valid communityId is required'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Title is required'
      });
    }

    if (variantId && !isValidObjectId(variantId)) {
      return res.status(400).json({
        message: 'Invalid variantId'
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

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      imageUrls = await Promise.all(
        req.files.map(file => uploadImage(file.buffer, 'revxchange/posts'))
      );
    }

    const newPost = await Post.create({
      communityId,
      authorId: req.user.id,
      variantId: variantId || null,
      title: title.trim(),
      body: body || '',
      imageUrls,
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

// ── DELETE /api/posts/comments/:id/images/:index ─────────────
router.delete('/comments/:id/images/:index', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your comment' });
    }

    if (!comment.imageUrls || idx >= comment.imageUrls.length) {
      return res.status(400).json({ message: 'Image index out of range' });
    }

    comment.imageUrls.splice(idx, 1);
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    res.json({ success: true, imageUrls: comment.imageUrls });
  } catch (err) {
    console.error('DELETE /api/posts/comments/:id/images/:index error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH /api/posts/comments/:id ─────────────────────────────
router.patch('/comments/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid comment ID'
      });
    }

    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({
        message: 'Body is required'
      });
    }

    if (body.trim().length > 5000) {
      return res.status(400).json({
        message: 'Comment too long, max 5000 chars'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        message: 'Comment not found'
      });
    }

    if (comment.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not your comment'
      });
    }

    comment.body = body.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    res.json({
      success: true,
      comment: {
        _id: comment._id,
        body: comment.body,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt
      }
    });
  } catch (err) {
    console.error('PATCH /api/posts/comments/:id error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── DELETE /api/posts/comments/:id ────────────────────────────
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid comment ID'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        message: 'Comment not found'
      });
    }

    if (comment.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not your comment'
      });
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();

    await comment.save();

    await Post.findOneAndUpdate(
      {
        _id: comment.postId,
        commentCount: { $gt: 0 }
      },
      {
        $inc: {
          commentCount: -1
        }
      }
    );

    res.json({
      success: true
    });
  } catch (err) {
    console.error('DELETE /api/posts/comments/:id error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── PATCH /api/posts/:id ──────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const { title, body } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not your post'
      });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          message: 'Title is required'
        });
      }

      post.title = title.trim();
    }

    if (body !== undefined) {
      post.body = body;
    }

    post.isEdited = true;
    post.editedAt = new Date();
    post.updatedAt = new Date();

    await post.save();

    res.json({
      success: true,
      post
    });
  } catch (err) {
    console.error('PATCH /api/posts/:id error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── DELETE /api/posts/:id ─────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not your post'
      });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();

    await post.save();

    await Community.findByIdAndUpdate(post.communityId, {
      $inc: {
        postCount: -1
      }
    });

    res.json({
      success: true
    });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── DELETE /api/posts/:id/images/:index ──────────────────────
router.delete('/:id/images/:index', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your post' });
    }

    if (!post.imageUrls || idx >= post.imageUrls.length) {
      return res.status(400).json({ message: 'Image index out of range' });
    }

    post.imageUrls.splice(idx, 1);
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();

    res.json({ success: true, imageUrls: post.imageUrls });
  } catch (err) {
    console.error('DELETE /api/posts/:id/images/:index error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/posts/:id/video ───────────────────────────────
router.delete('/:id/video', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your post' });
    }

    if (!post.videoUrl) {
      return res.status(400).json({ message: 'No video to remove' });
    }

    post.videoUrl = null;
    post.videoExpiresAt = null;
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/posts/:id/video error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/posts/:id/vote ───────────────────────────────────
router.put('/:id/vote', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

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
        if (existingVote.value === 1) upvoteChange = -1;
        if (existingVote.value === -1) downvoteChange = -1;

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

    if (post.upvotes < 0) post.upvotes = 0;
    if (post.downvotes < 0) post.downvotes = 0;

    post.score = post.upvotes - post.downvotes;
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

// ── POST /api/posts/:id/video ─────────────────────────────────
router.post('/:id/video', protect, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not your post'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No video file provided'
      });
    }

    const videoUrl = await uploadVideoFile(req.file.buffer, 'revxchange/videos');

    const videoExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    post.videoUrl = videoUrl;
    post.videoExpiresAt = videoExpiresAt;

    await post.save();

    res.json({
      success: true,
      videoUrl,
      videoExpiresAt
    });
  } catch (err) {
    console.error('POST /api/posts/:id/video error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── POST /api/posts/:id/share ─────────────────────────────────
router.post('/:id/share', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const { communityId, shareCommentary } = req.body;

    if (!communityId || !isValidObjectId(communityId)) {
      return res.status(400).json({
        message: 'Valid communityId is required'
      });
    }

    const original = await Post.findById(req.params.id);

    if (!original || original.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    if (original.isShare) {
      return res.status(400).json({
        message: 'Cannot share a shared post'
      });
    }

    if (original.communityId.toString() === communityId) {
      return res.status(400).json({
        message: 'Cannot share to the same community as the original'
      });
    }

    const membership = await CommunityMembership.findOne({
      userId: req.user.id,
      communityId
    });

    if (!membership) {
      return res.status(403).json({
        message: 'You must join the target community before sharing'
      });
    }

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    const commentary = shareCommentary?.trim() || null;

    const sharePost = await Post.create({
      communityId,
      authorId: req.user.id,
      isShare: true,
      sharedPostId: original._id,
      shareCommentary: commentary,
      title: commentary || 'Shared a post',
      upvotes: 1,
      downvotes: 0,
      score: 1,
      hotScore: 0,
      controversyScore: 0
    });

    await Vote.create({
      userId: req.user.id,
      postId: sharePost._id,
      value: 1
    });

    await Community.findByIdAndUpdate(communityId, {
      $inc: {
        postCount: 1
      }
    });

    const populated = await Post.findById(sharePost._id)
      .populate('authorId', 'name email')
      .populate({
        path: 'communityId',
        select: 'name slug isCentral memberCount postCount brandId',
        populate: {
          path: 'brandId',
          select: 'name slug logoUrl glowColor'
        }
      })
      .populate({
        path: 'sharedPostId',
        select: 'title body imageUrls videoUrl authorId communityId isDeleted',
        populate: [
          {
            path: 'authorId',
            select: 'name'
          },
          {
            path: 'communityId',
            select: 'name slug brandId',
            populate: {
              path: 'brandId',
              select: 'name logoUrl'
            }
          }
        ]
      })
      .lean();

    res.status(201).json({
      success: true,
      post: populated
    });
  } catch (err) {
    console.error('POST /api/posts/:id/share error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/* ============================================================
   COMMENTS
   ============================================================ */

// ── GET /api/posts/:id/comments ───────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    const allowedSorts = ['top', 'new'];
    const sort = allowedSorts.includes(req.query.sort) ? req.query.sort : 'top';
    const sortObj = sort === 'new' ? { createdAt: -1 } : { createdAt: 1 };

    const allComments = await Comment.find({
      postId: req.params.id,
      isDeleted: false
    })
      .populate('authorId', 'name email')
      .sort(sortObj)
      .lean();

    const normalized = allComments.map(c => ({
      _id: c._id,
      postId: c.postId,
      parentId: c.parentId || null,
      depth: c.depth || 0,
      body: c.body,
      imageUrls: c.imageUrls || [],
      isEdited: c.isEdited,
      editedAt: c.editedAt,
      createdAt: c.createdAt,
      author: c.authorId
        ? {
            _id: c.authorId._id,
            name: c.authorId.name,
            email: c.authorId.email
          }
        : null
    }));

    const map = {};
    const roots = [];

    normalized.forEach(comment => {
      map[comment._id.toString()] = {
        ...comment,
        replies: []
      };
    });

    normalized.forEach(comment => {
      if (comment.parentId) {
        const parent = map[comment.parentId.toString()];
        if (parent) parent.replies.push(map[comment._id.toString()]);
      } else {
        roots.push(map[comment._id.toString()]);
      }
    });

    res.json({
      success: true,
      comments: roots,
      total: allComments.length
    });
  } catch (err) {
    console.error('GET /api/posts/:id/comments error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// ── POST /api/posts/:id/comments ──────────────────────────────
router.post('/:id/comments', protect, uploadImages.array('images', 2), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const { body, parentId } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({
        message: 'Comment body is required'
      });
    }

    if (body.trim().length > 5000) {
      return res.status(400).json({
        message: 'Comment too long, max 5000 chars'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    let depth = 0;
    let resolvedParentId = null;

    if (parentId) {
      if (!isValidObjectId(parentId)) {
        return res.status(400).json({
          message: 'Invalid parent comment ID'
        });
      }

      const parent = await Comment.findById(parentId);

      if (!parent || parent.isDeleted) {
        return res.status(404).json({
          message: 'Parent comment not found'
        });
      }

      if (parent.postId.toString() !== req.params.id) {
        return res.status(400).json({
          message: 'Parent comment does not belong to this post'
        });
      }

      depth = Math.min((parent.depth || 0) + 1, 5);
      resolvedParentId = parent._id;
    }

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      imageUrls = await Promise.all(
        req.files.map(file => uploadImage(file.buffer, 'revxchange/comments'))
      );
    }

    const comment = await Comment.create({
      postId: post._id,
      authorId: req.user.id,
      parentId: resolvedParentId,
      depth,
      body: body.trim(),
      imageUrls
    });

    await Post.findByIdAndUpdate(post._id, {
      $inc: {
        commentCount: 1
      }
    });

    const populated = await Comment.findById(comment._id)
      .populate('authorId', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      comment: {
        _id: populated._id,
        postId: populated.postId,
        parentId: populated.parentId || null,
        depth: populated.depth,
        body: populated.body,
        imageUrls: populated.imageUrls || [],
        isEdited: populated.isEdited,
        createdAt: populated.createdAt,
        replies: [],
        author: populated.authorId
          ? {
              _id: populated.authorId._id,
              name: populated.authorId.name,
              email: populated.authorId.email
            }
          : null
      }
    });
  } catch (err) {
    console.error('POST /api/posts/:id/comments error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/* ============================================================
   SINGLE POST
   Keep this LAST because it is /:id
   ============================================================ */

// ── GET /api/posts/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid post ID'
      });
    }

    const userId = await getOptionalUserId(req);

    const post = await Post.findById(req.params.id)
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

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    let userVote = 0;

    if (userId) {
      const vote = await Vote.findOne({
        userId,
        postId: post._id
      }).lean();

      userVote = vote?.value || 0;
    }

    res.json({
      success: true,
      post: {
        _id: post._id,

        title: post.title,
        body: post.body,
        imageUrls: post.imageUrls || [],
        videoUrl: post.videoUrl || null,
        videoExpiresAt: post.videoExpiresAt || null,

        isShare: post.isShare || false,
        sharedPostId: post.sharedPostId || null,
        shareCommentary: post.shareCommentary || null,

        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        score: post.score || 0,
        hotScore: post.hotScore || 0,
        controversyScore: post.controversyScore || 0,
        commentCount: post.commentCount || 0,

        userVote,

        isEdited: post.isEdited || false,
        editedAt: post.editedAt || null,

        createdAt: post.createdAt,
        updatedAt: post.updatedAt,

        author: post.authorId
          ? {
              _id: post.authorId._id,
              name: post.authorId.name,
              email: post.authorId.email
            }
          : null,

        community: post.communityId
          ? {
              _id: post.communityId._id,
              name: post.communityId.name,
              slug: post.communityId.slug,
              isCentral: post.communityId.isCentral,
              memberCount: post.communityId.memberCount,
              postCount: post.communityId.postCount,
              brand: post.communityId.brandId || null
            }
          : null,

        variant: post.variantId
          ? {
              _id: post.variantId._id,
              label: post.variantId.label,
              yearStart: post.variantId.yearStart,
              yearEnd: post.variantId.yearEnd
            }
          : null
      }
    });
  } catch (err) {
    console.error('GET /api/posts/:id error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;