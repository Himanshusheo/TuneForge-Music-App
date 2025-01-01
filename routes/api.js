const express = require('express');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const { requireAuth, checkPremium } = require('../middleware/auth');

const router = express.Router();

// Apply premium check to all routes
router.use(checkPremium);

// API Routes for AJAX requests

// Get songs with filters (for dynamic loading)
router.get('/songs', async (req, res) => {
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
    
    res.json({
      success: true,
      data: {
        songs,
        pagination: {
          currentPage: page,
          totalPages,
          totalSongs,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('API songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching songs'
    });
  }
});

// Get trending songs
router.get('/songs/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const songs = await Song.getTrending(limit);
    
    res.json({
      success: true,
      data: songs
    });
    
  } catch (error) {
    console.error('API trending songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching trending songs'
    });
  }
});

// Get featured songs
router.get('/songs/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const songs = await Song.getFeatured(limit);
    
    res.json({
      success: true,
      data: songs
    });
    
  } catch (error) {
    console.error('API featured songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching featured songs'
    });
  }
});

// Get song details
router.get('/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('uploadedBy', 'username avatar')
      .populate('likes', 'username')
      .populate('comments.user', 'username avatar');
    
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }
    
    // Check premium access
    if (song.isPremium && !res.locals.isPremium) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required'
      });
    }
    
    res.json({
      success: true,
      data: song
    });
    
  } catch (error) {
    console.error('API song detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching song details'
    });
  }
});

// Get user playlists
router.get('/playlists', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const playlists = await Playlist.find({
      $or: [
        { createdBy: userId },
        { 'collaborators.user': userId }
      ]
    })
    .sort({ updatedAt: -1 })
    .populate('createdBy', 'username avatar')
    .populate('songs.song', 'title artist duration coverArt')
    .lean();
    
    res.json({
      success: true,
      data: playlists
    });
    
  } catch (error) {
    console.error('API playlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching playlists'
    });
  }
});

// Get public playlists
router.get('/playlists/public', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    
    const playlists = await Playlist.getPublic(limit, skip);
    
    res.json({
      success: true,
      data: playlists
    });
    
  } catch (error) {
    console.error('API public playlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching public playlists'
    });
  }
});

// Get featured playlists
router.get('/playlists/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const playlists = await Playlist.getFeatured(limit);
    
    res.json({
      success: true,
      data: playlists
    });
    
  } catch (error) {
    console.error('API featured playlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching featured playlists'
    });
  }
});

// Get playlist details
router.get('/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('songs.song')
      .populate('collaborators.user', 'username avatar')
      .populate('likes', 'username')
      .populate('followers', 'username');
    
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }
    
    // Check if user can view this playlist
    if (!playlist.canView(req.session.user?.id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this playlist'
      });
    }
    
    res.json({
      success: true,
      data: playlist
    });
    
  } catch (error) {
    console.error('API playlist detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching playlist details'
    });
  }
});

// Search API
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const type = req.query.type || 'all'; // all, songs, playlists, users
    const limit = parseInt(req.query.limit) || 20;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const results = {
      songs: [],
      playlists: [],
      users: []
    };
    
    // Search songs
    if (type === 'all' || type === 'songs') {
      const filters = { $text: { $search: query } };
      
      // Check premium access
      if (!res.locals.isPremium) {
        filters.isPremium = { $ne: true };
      }
      
      results.songs = await Song.find(filters)
        .limit(limit)
        .populate('uploadedBy', 'username avatar')
        .lean();
    }
    
    // Search playlists
    if (type === 'all' || type === 'playlists') {
      results.playlists = await Playlist.find({
        isPublic: true,
        $text: { $search: query }
      })
      .limit(limit)
      .populate('createdBy', 'username avatar')
      .populate('songs.song', 'title artist coverArt')
      .lean();
    }
    
    // Search users
    if (type === 'all' || type === 'users') {
      results.users = await User.find({
        isActive: true,
        $or: [
          { username: new RegExp(query, 'i') },
          { firstName: new RegExp(query, 'i') },
          { lastName: new RegExp(query, 'i') }
        ]
      })
      .limit(limit)
      .select('username firstName lastName avatar')
      .lean();
    }
    
    res.json({
      success: true,
      data: {
        query,
        type,
        results
      }
    });
    
  } catch (error) {
    console.error('API search error:', error);
    res.status(500).json({
      success: false,
      error: 'Error performing search'
    });
  }
});

// Get user profile
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .populate('playlists')
      .populate('favoriteSongs', 'title artist coverArt')
      .populate('listeningHistory.song', 'title artist coverArt')
      .select('-password');
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('API user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user profile'
    });
  }
});

// Get listening history
router.get('/user/history', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const user = await User.findById(req.session.user.id)
      .populate({
        path: 'listeningHistory.song',
        select: 'title artist coverArt duration'
      })
      .select('listeningHistory');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const history = user.listeningHistory.slice(0, limit);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('API listening history error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching listening history'
    });
  }
});

// Get user badges
router.get('/user/badges', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('badges');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.badges
    });
    
  } catch (error) {
    console.error('API user badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user badges'
    });
  }
});

// Get genres
router.get('/genres', async (req, res) => {
  try {
    const genres = await Song.distinct('genre');
    
    res.json({
      success: true,
      data: genres
    });
    
  } catch (error) {
    console.error('API genres error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching genres'
    });
  }
});

// Get artists
router.get('/artists', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const artists = await Song.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$artist', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
    
    res.json({
      success: true,
      data: artists
    });
    
  } catch (error) {
    console.error('API artists error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching artists'
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TuneForge API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
