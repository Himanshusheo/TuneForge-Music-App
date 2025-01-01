const express = require('express');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const User = require('../models/User');
const { requireAuth, checkPremium } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply premium check to all routes
router.use(checkPremium);

// Get user's playlists
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const playlists = await Playlist.find({
      $or: [
        { createdBy: userId },
        { 'collaborators.user': userId }
      ]
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .populate('songs.song', 'title artist duration coverArt')
    .lean();
    
    const totalPlaylists = await Playlist.countDocuments({
      $or: [
        { createdBy: userId },
        { 'collaborators.user': userId }
      ]
    });
    const totalPages = Math.ceil(totalPlaylists / limit);
    
    // Get public playlists for discovery
    const publicPlaylists = await Playlist.getPublic(6);
    const featuredPlaylists = await Playlist.getFeatured(6);
    
    res.render('playlists/index', {
      title: 'My Playlists - TuneForge',
      playlists,
      publicPlaylists,
      featuredPlaylists,
      currentPage: page,
      totalPages,
      totalPlaylists,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Playlists index error:', error);
    req.flash('error', 'Error loading playlists');
    res.redirect('/dashboard');
  }
});

// Get public playlists
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const playlists = await Playlist.getPublic(limit, skip);
    
    const totalPlaylists = await Playlist.countDocuments({ isPublic: true });
    const totalPages = Math.ceil(totalPlaylists / limit);
    
    res.render('playlists/public', {
      title: 'Public Playlists - TuneForge',
      playlists,
      currentPage: page,
      totalPages,
      totalPlaylists,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Public playlists error:', error);
    req.flash('error', 'Error loading public playlists');
    res.redirect('/playlists');
  }
});

// Create playlist page
router.get('/create', requireAuth, (req, res) => {
  res.render('playlists/create', {
    title: 'Create Playlist - TuneForge',
    user: req.session.user
  });
});

// Create playlist
router.post('/create', requireAuth, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('playlists/create', {
        title: 'Create Playlist - TuneForge',
        errors: errors.array(),
        formData: req.body,
        user: req.session.user
      });
    }
    
    const { name, description, isPublic, isCollaborative, category, mood } = req.body;
    
    const playlist = new Playlist({
      name,
      description,
      isPublic: isPublic === 'true',
      isCollaborative: isCollaborative === 'true',
      category,
      mood,
      createdBy: req.session.user.id
    });
    
    await playlist.save();
    
    req.flash('success', 'Playlist created successfully!');
    res.redirect(`/playlists/${playlist._id}`);
    
  } catch (error) {
    console.error('Create playlist error:', error);
    req.flash('error', 'Error creating playlist');
    res.render('playlists/create', {
      title: 'Create Playlist - TuneForge',
      errors: [{ msg: 'Error creating playlist' }],
      formData: req.body,
      user: req.session.user
    });
  }
});

// Get single playlist
router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('songs.song')
      .populate('collaborators.user', 'username avatar')
      .populate('likes', 'username')
      .populate('followers', 'username');
    
    if (!playlist) {
      req.flash('error', 'Playlist not found');
      return res.redirect('/playlists');
    }
    
    // Check if user can view this playlist
    if (!playlist.canView(req.session.user?.id)) {
      req.flash('error', 'You do not have permission to view this playlist');
      return res.redirect('/playlists');
    }
    
    // Check premium access for premium songs
    const songs = playlist.songs.map(item => {
      const song = item.song;
      if (song.isPremium && !res.locals.isPremium) {
        song.premiumLocked = true;
      }
      return item;
    });
    
    // Check if user can edit
    const canEdit = playlist.canEdit(req.session.user?.id);
    
    // Check if user liked/followed this playlist
    let userInteraction = null;
    if (req.session.user) {
      const userId = req.session.user.id;
      userInteraction = {
        liked: playlist.likes.includes(userId),
        followed: playlist.followers.includes(userId)
      };
    }
    
    res.render('playlists/detail', {
      title: `${playlist.name} - TuneForge`,
      playlist,
      songs,
      canEdit,
      userInteraction,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Playlist detail error:', error);
    req.flash('error', 'Error loading playlist');
    res.redirect('/playlists');
  }
});

// Edit playlist page
router.get('/:id/edit', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      req.flash('error', 'Playlist not found');
      return res.redirect('/playlists');
    }
    
    if (!playlist.canEdit(req.session.user.id)) {
      req.flash('error', 'You do not have permission to edit this playlist');
      return res.redirect(`/playlists/${playlist._id}`);
    }
    
    res.render('playlists/edit', {
      title: `Edit ${playlist.name} - TuneForge`,
      playlist,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Edit playlist error:', error);
    req.flash('error', 'Error loading playlist');
    res.redirect('/playlists');
  }
});

// Update playlist
router.post('/:id/edit', requireAuth, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const playlist = await Playlist.findById(req.params.id);
      return res.render('playlists/edit', {
        title: `Edit ${playlist.name} - TuneForge`,
        playlist,
        errors: errors.array(),
        user: req.session.user
      });
    }
    
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      req.flash('error', 'Playlist not found');
      return res.redirect('/playlists');
    }
    
    if (!playlist.canEdit(req.session.user.id)) {
      req.flash('error', 'You do not have permission to edit this playlist');
      return res.redirect(`/playlists/${playlist._id}`);
    }
    
    const { name, description, isPublic, isCollaborative, category, mood } = req.body;
    
    playlist.name = name;
    playlist.description = description;
    playlist.isPublic = isPublic === 'true';
    playlist.isCollaborative = isCollaborative === 'true';
    playlist.category = category;
    playlist.mood = mood;
    
    await playlist.save();
    
    req.flash('success', 'Playlist updated successfully!');
    res.redirect(`/playlists/${playlist._id}`);
    
  } catch (error) {
    console.error('Update playlist error:', error);
    req.flash('error', 'Error updating playlist');
    res.redirect(`/playlists/${req.params.id}/edit`);
  }
});

// Add song to playlist
router.post('/:id/songs', requireAuth, async (req, res) => {
  try {
    const { songId } = req.body;
    
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!playlist.canEdit(req.session.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to edit this playlist' });
    }
    
    const song = await Song.findById(songId);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    await playlist.addSong(songId, req.session.user.id);
    
    res.json({
      success: true,
      message: 'Song added to playlist successfully'
    });
    
  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({ error: error.message || 'Error adding song to playlist' });
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!playlist.canEdit(req.session.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to edit this playlist' });
    }
    
    await playlist.removeSong(req.params.songId);
    
    res.json({
      success: true,
      message: 'Song removed from playlist successfully'
    });
    
  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({ error: 'Error removing song from playlist' });
  }
});

// Reorder songs in playlist
router.post('/:id/reorder', requireAuth, async (req, res) => {
  try {
    const { songOrders } = req.body;
    
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!playlist.canEdit(req.session.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to edit this playlist' });
    }
    
    await playlist.reorderSongs(songOrders);
    
    res.json({
      success: true,
      message: 'Playlist reordered successfully'
    });
    
  } catch (error) {
    console.error('Reorder playlist error:', error);
    res.status(500).json({ error: 'Error reordering playlist' });
  }
});

// Delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (playlist.createdBy.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only delete your own playlists' });
    }
    
    await Playlist.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Error deleting playlist' });
  }
});

// Toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    await playlist.toggleLike(req.session.user.id);
    
    res.json({
      success: true,
      likeCount: playlist.likeCount
    });
    
  } catch (error) {
    console.error('Like playlist error:', error);
    res.status(500).json({ error: 'Error updating like status' });
  }
});

// Toggle follow
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    await playlist.toggleFollow(req.session.user.id);
    
    res.json({
      success: true,
      followerCount: playlist.followerCount
    });
    
  } catch (error) {
    console.error('Follow playlist error:', error);
    res.status(500).json({ error: 'Error updating follow status' });
  }
});

// Play playlist
router.post('/:id/play', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!playlist.canView(req.session.user?.id)) {
      return res.status(403).json({ error: 'You do not have permission to play this playlist' });
    }
    
    await playlist.incrementPlayCount();
    
    res.json({
      success: true,
      message: 'Playlist started'
    });
    
  } catch (error) {
    console.error('Play playlist error:', error);
    res.status(500).json({ error: 'Error playing playlist' });
  }
});

module.exports = router;
