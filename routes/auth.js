const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireGuest, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Flash messages middleware
router.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// Register page
router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { 
    title: 'Register - TuneForge',
    errors: [],
    formData: {}
  });
});

// Login page
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { 
    title: 'Login - TuneForge',
    errors: [],
    formData: {}
  });
});

// Register POST
router.post('/register', requireGuest, [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Register - TuneForge',
        errors: errors.array(),
        formData: req.body
      });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      req.flash('error', 'User with this email or username already exists');
      return res.render('auth/register', {
        title: 'Register - TuneForge',
        errors: [{ msg: 'User with this email or username already exists' }],
        formData: req.body
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Set session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      subscription: user.subscription,
      avatar: user.avatar
    };

    req.flash('success', 'Registration successful! Welcome to TuneForge!');
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed. Please try again.');
    res.render('auth/register', {
      title: 'Register - TuneForge',
      errors: [{ msg: 'Registration failed. Please try again.' }],
      formData: req.body
    });
  }
});

// Login POST
router.post('/login', requireGuest, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login - TuneForge',
        errors: errors.array(),
        formData: req.body
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.render('auth/login', {
        title: 'Login - TuneForge',
        errors: [{ msg: 'Invalid email or password' }],
        formData: req.body
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.render('auth/login', {
        title: 'Login - TuneForge',
        errors: [{ msg: 'Invalid email or password' }],
        formData: req.body
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      subscription: user.subscription,
      avatar: user.avatar
    };

    req.flash('success', `Welcome back, ${user.firstName}!`);
    
    // Redirect to intended page or dashboard
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);

  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.render('auth/login', {
      title: 'Login - TuneForge',
      errors: [{ msg: 'Login failed. Please try again.' }],
      formData: req.body
    });
  }
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      req.flash('error', 'Error logging out');
      return res.redirect('/');
    }
    
    res.clearCookie('connect.sid');
    req.flash('success', 'You have been logged out successfully');
    res.redirect('/');
  });
});

// Profile page
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .populate('playlists')
      .populate('favoriteSongs', 'title artist coverArt')
      .populate('listeningHistory.song', 'title artist coverArt');

    res.render('auth/profile', {
      title: 'Profile - TuneForge',
      user: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.flash('error', 'Error loading profile');
    res.redirect('/dashboard');
  }
});

// Update profile
router.post('/profile', requireAuth, [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      req.flash('error', 'Please correct the errors below');
      return res.redirect('/auth/profile');
    }

    const { firstName, lastName, username } = req.body;
    const userId = req.session.user.id;

    // Check if username is taken by another user
    const existingUser = await User.findOne({
      username,
      _id: { $ne: userId }
    });

    if (existingUser) {
      req.flash('error', 'Username is already taken');
      return res.redirect('/auth/profile');
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, username },
      { new: true }
    );

    // Update session
    req.session.user.username = user.username;
    req.session.user.firstName = user.firstName;
    req.session.user.lastName = user.lastName;

    req.flash('success', 'Profile updated successfully');
    res.redirect('/auth/profile');

  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Error updating profile');
    res.redirect('/auth/profile');
  }
});

module.exports = router;
