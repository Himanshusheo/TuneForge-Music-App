const express = require('express');
const Song = require('../models/Song');
const User = require('../models/User');
const { requireAuth, requirePremium, checkPremium } = require('../middleware/auth');
const { uploadSongWithCover, handleUploadError } = require('../middleware/upload');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply premium check to all routes
router.use(checkPremium);

// Get all songs with filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filters = {};
    const sort = {};
    
    // Apply filters
    if (req.query.genre) {
      filters.genre = req.query.genre;
    }
    if (req.query.artist) {
      filters.artist = new RegExp(req.query.artist, 'i');
    }
    if (req.query.year) {
      filters.releaseYear = parseInt(req.query.year);
    }
    if (req.query.search) {
      filters.$text = { $search: req.query.search };
    }
    if (req.query.mood) {
      filters.mood = req.query.mood;
    }
    
    // Apply sorting
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest':
          sort.createdAt = -1;
          break;
        case 'oldest':
          sort.createdAt = 1;
          break;
        case 'popular':
          sort.playCount = -1;
          break;
        case 'title':
          sort.title = 1;
          break;
        case 'artist':
          sort.artist = 1;
          break;
        default:
          sort.createdAt = -1;
      }
    } else {
      sort.createdAt = -1;
    }
    
    // Check premium access for premium songs
    // Filter out premium songs for non-premium users
    if (!res.locals.isPremium) {
      filters.isPremium = { $ne: true };
    }
    
    const songs = await Song.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'username avatar')
      .lean();
    
    const totalSongs = await Song.countDocuments(filters);
    const totalPages = Math.ceil(totalSongs / limit);
    
    // Get trending and featured songs for sidebar
    const trendingSongs = await Song.getTrending(5);
    const featuredSongs = await Song.getFeatured(5);
    
    res.render('songs/index', {
      title: 'Songs - TuneForge',
      songs,
      trendingSongs,
      featuredSongs,
      currentPage: page,
      totalPages,
      totalSongs,
      filters: req.query,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Songs index error:', error);
    req.flash('error', 'Error loading songs');
    res.redirect('/');
  }
});

// Get single song
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('uploadedBy', 'username avatar')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatar');
    
    if (!song) {
      req.flash('error', 'Song not found');
      return res.redirect('/songs');
    }
    
    // Check premium access
    if (song.isPremium && !res.locals.isPremium) {
      req.flash('error', 'Premium subscription required to access this song');
      return res.redirect('/subscription');
    }
    
    // Get related songs
    const relatedSongs = await Song.find({
      _id: { $ne: song._id },
      $or: [
        { artist: song.artist },
        { genre: song.genre }
      ],
      isActive: true
    })
    .limit(5)
    .populate('uploadedBy', 'username avatar');
    
    // Check if user liked/disliked this song
    let userInteraction = null;
    if (req.session.user) {
      const userId = req.session.user.id;
      userInteraction = {
        liked: song.likes.includes(userId),
        disliked: song.dislikes.includes(userId)
      };
    }
    
    res.render('songs/detail', {
      title: `${song.title} - ${song.artist} - TuneForge`,
      song,
      relatedSongs,
      userInteraction,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Song detail error:', error);
    req.flash('error', 'Error loading song');
    res.redirect('/songs');
  }
});

// Stream song (serve audio file)
router.get('/:id/stream', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    // Check premium access
    if (song.isPremium && !res.locals.isPremium) {
      return res.status(403).json({ error: 'Premium subscription required' });
    }
    
    // Increment play count
    await song.incrementPlayCount();
    
    // Add to user's listening history if logged in
    if (req.session.user) {
      const user = await User.findById(req.session.user.id);
      if (user) {
        await user.addToHistory(song._id, song.duration);
      }
    }
    
    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Serve the file
    const path = require('path');
    const filePath = path.join(__dirname, '..', song.filePath);
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Song stream error:', error);
    res.status(500).json({ error: 'Error streaming song' });
  }
});

// Toggle like/dislike
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    await song.toggleLike(req.session.user.id);
    
    res.json({
      success: true,
      likeCount: song.likeCount,
      dislikeCount: song.dislikeCount
    });
    
  } catch (error) {
    console.error('Like toggle error:', error);
    res.status(500).json({ error: 'Error updating like status' });
  }
});

router.post('/:id/dislike', requireAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    await song.toggleDislike(req.session.user.id);
    
    res.json({
      success: true,
      likeCount: song.likeCount,
      dislikeCount: song.dislikeCount
    });
    
  } catch (error) {
    console.error('Dislike toggle error:', error);
    res.status(500).json({ error: 'Error updating dislike status' });
  }
});

// Add comment
router.post('/:id/comments', requireAuth, [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    song.comments.push({
      user: req.session.user.id,
      text: req.body.text
    });
    
    await song.save();
    
    // Populate the comment for response
    await song.populate('comments.user', 'username avatar');
    const newComment = song.comments[song.comments.length - 1];
    
    res.json({
      success: true,
      comment: newComment
    });
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Search songs
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    if (!query) {
      return res.redirect('/songs');
    }
    
    const filters = {};
    
    // Check premium access
    if (!res.locals.isPremium) {
      filters.isPremium = { $ne: true };
    }
    
    const songs = await Song.search(query, filters)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'username avatar');
    
    const totalSongs = await Song.countDocuments({
      ...filters,
      $text: { $search: query }
    });
    const totalPages = Math.ceil(totalSongs / limit);
    
    res.render('songs/search', {
      title: `Search Results for "${query}" - TuneForge`,
      songs,
      query,
      currentPage: page,
      totalPages,
      totalSongs,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Search error:', error);
    req.flash('error', 'Error performing search');
    res.redirect('/songs');
  }
});

// Get song lyrics
router.get('/:id/lyrics', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({
      success: true,
      lyrics: song.lyrics
    });
    
  } catch (error) {
    console.error('Get lyrics error:', error);
    res.status(500).json({ error: 'Error fetching lyrics' });
  }
});

// Error handling middleware
router.use(handleUploadError);

module.exports = router;
