const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const protect = require('../middleware/auth');

const Community = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');
const Brand = require('../models/Brand');
const Post = require('../models/Post');
const Vote = require('../models/Vote');

// Register referenced models for populate()
require('../models/CarVariant');

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        role: decoded.role
      };
    }
  } catch {
    // Invalid token means guest request.
  }

  next();
};

function getSortObject(sort) {
  if (sort === 'new') {
    return { createdAt: -1 };
  }

  if (sort === 'hot') {
    return { hotScore: -1, createdAt: -1 };
  }

  if (sort === 'controversial') {
    return { controversyScore: -1, createdAt: -1 };
  }

  return { score: -1, createdAt: -1 };
}

function cleanSort(sort) {
  const allowedSorts = ['top', 'new', 'hot', 'controversial'];

  if (allowedSorts.includes(sort)) {
    return sort;
  }

  return 'top';
}

// GET /api/communities
router.get('/', optionalAuth, async (req, res) => {
  try {
    const communities = await Community.find({})
      .populate('brandId', 'name slug logoUrl glowColor')
      .sort({ memberCount: -1, name: 1 })
      .lean();

    let joinedCommunityIds = new Set();

    if (req.user && req.user.id) {
      const memberships = await CommunityMembership.find({
        userId: req.user.id
      })
        .select('communityId')
        .lean();

      joinedCommunityIds = new Set(
        memberships.map(membership => membership.communityId.toString())
      );
    }

    const formattedCommunities = communities.map(community => ({
      ...community,
      joined: joinedCommunityIds.has(community._id.toString())
    }));

    res.json({
      communities: formattedCommunities
    });
  } catch (err) {
    console.error('GET /api/communities error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// GET /api/communities/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const community = await Community.findOne({
      slug: req.params.slug
    })
      .populate('brandId', 'name slug logoUrl glowColor')
      .lean();

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    let joined = false;

    if (req.user && req.user.id) {
      const membership = await CommunityMembership.findOne({
        userId: req.user.id,
        communityId: community._id
      }).lean();

      joined = Boolean(membership);
    }

    res.json({
      community: {
        ...community,
        joined
      }
    });
  } catch (err) {
    console.error('GET /api/communities/:slug error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// POST /api/communities/:id/join
router.post('/:id/join', protect, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    const existingMembership = await CommunityMembership.findOne({
      userId: req.user.id,
      communityId: community._id
    });

    if (existingMembership) {
      return res.json({
        success: true,
        message: 'Already joined',
        joined: true
      });
    }

    await CommunityMembership.create({
      userId: req.user.id,
      communityId: community._id,
      variantId: req.body.variantId || null
    });

    community.memberCount += 1;
    await community.save();

    res.status(201).json({
      success: true,
      message: 'Community joined',
      joined: true
    });
  } catch (err) {
    console.error('POST /api/communities/:id/join error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// DELETE /api/communities/:id/leave
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    const deletedMembership = await CommunityMembership.findOneAndDelete({
      userId: req.user.id,
      communityId: community._id
    });

    if (!deletedMembership) {
      return res.json({
        success: true,
        message: 'You were not a member',
        joined: false
      });
    }

    if (community.memberCount > 0) {
      community.memberCount -= 1;
      await community.save();
    }

    res.json({
      success: true,
      message: 'Community left',
      joined: false
    });
  } catch (err) {
    console.error('DELETE /api/communities/:id/leave error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// GET /api/communities/:slug/posts?sort=top|new|hot|controversial&page=N
router.get('/:slug/posts', optionalAuth, async (req, res) => {
  try {
    const community = await Community.findOne({
      slug: req.params.slug
    }).lean();

    if (!community) {
      return res.status(404).json({
        message: 'Community not found'
      });
    }

    const sort = cleanSort(req.query.sort);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 12;
    const skip = (page - 1) * limit;

    const filter = {
      communityId: community._id,
      isDeleted: false
    };

    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate('authorId', 'name email')
      .populate({
        path: 'communityId',
        select: 'name slug isCentral brandId memberCount postCount',
        populate: {
          path: 'brandId',
          select: 'name slug logoUrl glowColor'
        }
      })
      .populate('variantId', 'label yearStart yearEnd order')
      .populate({
        path: 'sharedPostId',
        select: 'title body imageUrls videoUrl authorId communityId isDeleted',
        populate: [
          { path: 'authorId', select: 'name' },
          {
            path: 'communityId',
            select: 'name slug brandId',
            populate: { path: 'brandId', select: 'name logoUrl' }
          }
        ]
      })
      .sort(getSortObject(sort))
      .skip(skip)
      .limit(limit)
      .lean();

    let userVoteMap = new Map();

    if (req.user && req.user.id && posts.length > 0) {
      const postIds = posts.map(post => post._id);

      const userVotes = await Vote.find({
        userId: req.user.id,
        postId: {
          $in: postIds
        }
      }).lean();

      userVoteMap = new Map(
        userVotes.map(vote => [
          vote.postId.toString(),
          vote.value
        ])
      );
    }

    const formattedPosts = posts.map(post => {
      const author = post.authorId;
      const postCommunity = post.communityId;
      const variant = post.variantId;

      return {
        _id: post._id,

        title: post.title,
        body: post.body,
        imageUrls: post.imageUrls || [],
        videoUrl: post.videoUrl || null,
        videoExpiresAt: post.videoExpiresAt || null,

        isShare: post.isShare,
        sharedPostId: post.sharedPostId,
        shareCommentary: post.shareCommentary,
        sharedPost: post.sharedPostId
          ? {
              _id:       post.sharedPostId._id,
              title:     post.sharedPostId.title,
              body:      post.sharedPostId.body,
              imageUrls: post.sharedPostId.imageUrls || [],
              videoUrl:  post.sharedPostId.videoUrl  || null,
              isDeleted: post.sharedPostId.isDeleted,
              author: post.sharedPostId.authorId
                ? { name: post.sharedPostId.authorId.name }
                : null,
              community: post.sharedPostId.communityId
                ? {
                    name:  post.sharedPostId.communityId.name,
                    slug:  post.sharedPostId.communityId.slug,
                    brand: post.sharedPostId.communityId.brandId || null
                  }
                : null
            }
          : null,

        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        score: post.score || 0,
        hotScore: post.hotScore || 0,
        controversyScore: post.controversyScore || 0,
        commentCount: post.commentCount || 0,

        userVote: userVoteMap.get(post._id.toString()) || 0,

        isEdited: post.isEdited,
        editedAt: post.editedAt,

        createdAt: post.createdAt,
        updatedAt: post.updatedAt,

        author: author
          ? {
              _id: author._id,
              name: author.name,
              email: author.email
            }
          : null,

        community: postCommunity
          ? {
              _id: postCommunity._id,
              name: postCommunity.name,
              slug: postCommunity.slug,
              isCentral: postCommunity.isCentral,
              memberCount: postCommunity.memberCount,
              postCount: postCommunity.postCount,
              brand: postCommunity.brandId
                ? {
                    _id: postCommunity.brandId._id,
                    name: postCommunity.brandId.name,
                    slug: postCommunity.brandId.slug,
                    logoUrl: postCommunity.brandId.logoUrl,
                    glowColor: postCommunity.brandId.glowColor
                  }
                : null
            }
          : null,

        variant: variant
          ? {
              _id: variant._id,
              label: variant.label,
              yearStart: variant.yearStart,
              yearEnd: variant.yearEnd,
              order: variant.order
            }
          : null
      };
    });

    res.json({
      community,
      posts: formattedPosts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      sort
    });
  } catch (err) {
    console.error('GET /api/communities/:slug/posts error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;