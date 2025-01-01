const express = require('express');
const Song = require('../models/Song');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const { requireAdmin, checkAdmin } = require('../middleware/auth');
const { uploadSongWithCover, handleUploadError } = require('../middleware/upload');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Apply admin check to all routes
router.use(requireAdmin);

// Admin dashboard
router.get('/', async (req, res) => {
  try {
    // Get statistics
    const totalUsers = await User.countDocuments();
    const totalSongs = await Song.countDocuments();
    const totalPlaylists = await Playlist.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ 
      'subscription.type': { $ne: 'free' },
      'subscription.isActive': true 
    });
    
    // Get recent activity
    const recentSongs = await Song.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('uploadedBy', 'username');
    
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email firstName lastName createdAt');
    
    const topSongs = await Song.find({ isActive: true })
      .sort({ playCount: -1 })
      .limit(5)
      .populate('uploadedBy', 'username');
    
    // Get genre distribution
    const genreStats = await Song.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - TuneForge',
      stats: {
        totalUsers,
        totalSongs,
        totalPlaylists,
        activeUsers,
        premiumUsers
      },
      recentSongs,
      recentUsers,
      topSongs,
      genreStats,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Error loading admin dashboard');
    res.redirect('/');
  }
});

// Song management
router.get('/songs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filters = {};
    
    // Apply filters
    if (req.query.status) {
      filters.isActive = req.query.status === 'active';
    }
    if (req.query.genre) {
      filters.genre = req.query.genre;
    }
    if (req.query.search) {
      filters.$text = { $search: req.query.search };
    }
    
    const songs = await Song.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'username email');
    
    const totalSongs = await Song.countDocuments(filters);
    const totalPages = Math.ceil(totalSongs / limit);
    
    res.render('admin/songs', {
      title: 'Manage Songs - TuneForge',
      songs,
      currentPage: page,
      totalPages,
      totalSongs,
      filters: req.query,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Admin songs error:', error);
    req.flash('error', 'Error loading songs');
    res.redirect('/admin');
  }
});

// Upload song page
router.get('/songs/upload', (req, res) => {
  res.render('admin/upload-song', {
    title: 'Upload Song - TuneForge',
    user: req.session.user
  });
});

// Upload song
router.post('/songs/upload', uploadSongWithCover.fields([
  { name: 'songFile', maxCount: 1 },
  { name: 'coverArt', maxCount: 1 }
]), [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('artist')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist is required and must be less than 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album must be less than 100 characters'),
  body('genre')
    .isIn(['pop', 'rock', 'hip-hop', 'jazz', 'classical', 'electronic', 'country', 'blues', 'reggae', 'folk', 'other'])
    .withMessage('Please select a valid genre'),
  body('duration')
    .isNumeric()
    .withMessage('Duration must be a number'),
  body('releaseYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Please enter a valid release year')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        });
      }
      
      return res.render('admin/upload-song', {
        title: 'Upload Song - TuneForge',
        errors: errors.array(),
        formData: req.body,
        user: req.session.user
      });
    }
    
    if (!req.files || !req.files.songFile) {
      return res.render('admin/upload-song', {
        title: 'Upload Song - TuneForge',
        errors: [{ msg: 'Song file is required' }],
        formData: req.body,
        user: req.session.user
      });
    }
    
    const songFile = req.files.songFile[0];
    const coverArt = req.files.coverArt ? req.files.coverArt[0] : null;
    
    const {
      title,
      artist,
      album,
      genre,
      duration,
      releaseYear,
      language,
      explicit,
      lyrics,
      mood,
      bpm,
      key,
      isPremium,
      isFeatured,
      tags
    } = req.body;
    
    // Create song object
    const songData = {
      title,
      artist,
      album,
      genre,
      duration: parseInt(duration),
      filePath: songFile.path.replace(/\\/g, '/'),
      uploadedBy: req.session.user.id,
      language: language || 'English',
      explicit: explicit === 'true',
      lyrics: lyrics || '',
      mood,
      bpm: bpm ? parseInt(bpm) : undefined,
      key,
      isPremium: isPremium === 'true',
      isFeatured: isFeatured === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      fileSize: songFile.size,
      bitrate: 320 // Default bitrate, could be extracted from file
    };
    
    if (coverArt) {
      songData.coverArt = coverArt.path.replace(/\\/g, '/');
    }
    
    if (releaseYear) {
      songData.releaseYear = parseInt(releaseYear);
    }
    
    const song = new Song(songData);
    await song.save();
    
    req.flash('success', 'Song uploaded successfully!');
    res.redirect('/admin/songs');
    
  } catch (error) {
    console.error('Upload song error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      });
    }
    
    req.flash('error', 'Error uploading song');
    res.render('admin/upload-song', {
      title: 'Upload Song - TuneForge',
      errors: [{ msg: 'Error uploading song' }],
      formData: req.body,
      user: req.session.user
    });
  }
});

// Edit song page
router.get('/songs/:id/edit', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('uploadedBy', 'username');
    
    if (!song) {
      req.flash('error', 'Song not found');
      return res.redirect('/admin/songs');
    }
    
    res.render('admin/edit-song', {
      title: `Edit ${song.title} - TuneForge`,
      song,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Edit song error:', error);
    req.flash('error', 'Error loading song');
    res.redirect('/admin/songs');
  }
});

// Update song
router.post('/songs/:id/edit', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('artist')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist is required and must be less than 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album must be less than 100 characters'),
  body('genre')
    .isIn(['pop', 'rock', 'hip-hop', 'jazz', 'classical', 'electronic', 'country', 'blues', 'reggae', 'folk', 'other'])
    .withMessage('Please select a valid genre')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const song = await Song.findById(req.params.id);
      return res.render('admin/edit-song', {
        title: `Edit ${song.title} - TuneForge`,
        song,
        errors: errors.array(),
        user: req.session.user
      });
    }
    
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      req.flash('error', 'Song not found');
      return res.redirect('/admin/songs');
    }
    
    const {
      title,
      artist,
      album,
      genre,
      releaseYear,
      language,
      explicit,
      lyrics,
      mood,
      bpm,
      key,
      isPremium,
      isFeatured,
      isActive,
      tags
    } = req.body;
    
    song.title = title;
    song.artist = artist;
    song.album = album;
    song.genre = genre;
    song.language = language || 'English';
    song.explicit = explicit === 'true';
    song.lyrics = lyrics || '';
    song.mood = mood;
    song.bpm = bpm ? parseInt(bpm) : undefined;
    song.key = key;
    song.isPremium = isPremium === 'true';
    song.isFeatured = isFeatured === 'true';
    song.isActive = isActive === 'true';
    song.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    if (releaseYear) {
      song.releaseYear = parseInt(releaseYear);
    }
    
    await song.save();
    
    req.flash('success', 'Song updated successfully!');
    res.redirect('/admin/songs');
    
  } catch (error) {
    console.error('Update song error:', error);
    req.flash('error', 'Error updating song');
    res.redirect(`/admin/songs/${req.params.id}/edit`);
  }
});

// Delete song
router.delete('/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(song.filePath)) {
      fs.unlinkSync(song.filePath);
    }
    
    if (fs.existsSync(song.coverArt)) {
      fs.unlinkSync(song.coverArt);
    }
    
    await Song.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Song deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Error deleting song' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filters = {};
    
    // Apply filters
    if (req.query.status) {
      filters.isActive = req.query.status === 'active';
    }
    if (req.query.role) {
      filters.role = req.query.role;
    }
    if (req.query.subscription) {
      filters['subscription.type'] = req.query.subscription;
    }
    if (req.query.search) {
      filters.$or = [
        { username: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { firstName: new RegExp(req.query.search, 'i') },
        { lastName: new RegExp(req.query.search, 'i') }
      ];
    }
    
    const users = await User.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');
    
    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.render('admin/users', {
      title: 'Manage Users - TuneForge',
      users,
      currentPage: page,
      totalPages,
      totalUsers,
      filters: req.query,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Admin users error:', error);
    req.flash('error', 'Error loading users');
    res.redirect('/admin');
  }
});

// Update user status
router.post('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: isActive === 'true' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: `User ${isActive === 'true' ? 'activated' : 'deactivated'} successfully`
    });
    
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Error updating user status' });
  }
});

// Update user role
router.post('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
    
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Error updating user role' });
  }
});

// Error handling middleware
router.use(handleUploadError);

module.exports = router;
