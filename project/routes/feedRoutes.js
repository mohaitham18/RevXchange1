const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const Post = require('../models/Post');
const Vote = require('../models/Vote');
const CommunityMembership = require('../models/CommunityMembership');

// Register referenced models for populate()
require('../models/Brand');
require('../models/CarVariant');

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id
      };
    }
  } catch {
    // Invalid token means guest feed.
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

function cleanSort(sort, isLoggedIn) {
  const allowedSorts = ['top', 'new', 'hot', 'controversial'];

  if (allowedSorts.includes(sort)) {
    return sort;
  }

  return isLoggedIn ? 'top' : 'hot';
}

// GET /api/feed?sort=top|new|hot|controversial&page=N
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.user && req.user.id);

    const sort = cleanSort(req.query.sort, isLoggedIn);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 12;
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false
    };

    if (isLoggedIn) {
      const memberships = await CommunityMembership.find({
        userId: req.user.id
      })
        .select('communityId')
        .lean();

      const joinedCommunityIds = memberships.map(membership => membership.communityId);

      if (joinedCommunityIds.length === 0) {
        return res.json({
          posts: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          sort,
          source: 'joined-communities'
        });
      }

      filter.communityId = {
        $in: joinedCommunityIds
      };
    }

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

    if (isLoggedIn && posts.length > 0) {
      const postIds = posts.map(post => post._id);

      const userVotes = await Vote.find({
        userId: req.user.id,
        postId: { $in: postIds }
      }).lean();

      userVoteMap = new Map(
        userVotes.map(vote => [
          vote.postId.toString(),
          vote.value
        ])
      );
    }

    const formattedPosts = posts.map(post => {
      const community = post.communityId;
      const author = post.authorId;
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

        community: community
          ? {
              _id: community._id,
              name: community.name,
              slug: community.slug,
              isCentral: community.isCentral,
              memberCount: community.memberCount,
              postCount: community.postCount,
              brand: community.brandId
                ? {
                    _id: community.brandId._id,
                    name: community.brandId.name,
                    slug: community.brandId.slug,
                    logoUrl: community.brandId.logoUrl,
                    glowColor: community.brandId.glowColor
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
      posts: formattedPosts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      sort,
      source: isLoggedIn ? 'joined-communities' : 'site-wide'
    });
  } catch (err) {
    console.error('GET /api/feed error:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;