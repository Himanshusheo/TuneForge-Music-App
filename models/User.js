const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  badges: [{
    name: String,
    description: String,
    earnedDate: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    autoplay: {
      type: Boolean,
      default: true
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  playlists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  favoriteSongs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  listeningHistory: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    playedAt: {
      type: Date,
      default: Date.now
    },
    duration: Number // in seconds
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if user has premium access
userSchema.methods.hasPremiumAccess = function() {
  return this.subscription.type !== 'free' && this.subscription.isActive;
};

// Add badge method
userSchema.methods.addBadge = function(badgeName, description, icon) {
  const existingBadge = this.badges.find(badge => badge.name === badgeName);
  if (!existingBadge) {
    this.badges.push({
      name: badgeName,
      description,
      icon,
      earnedDate: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Update listening history
userSchema.methods.addToHistory = function(songId, duration) {
  this.listeningHistory.unshift({
    song: songId,
    playedAt: new Date(),
    duration
  });
  
  // Keep only last 100 entries
  if (this.listeningHistory.length > 100) {
    this.listeningHistory = this.listeningHistory.slice(0, 100);
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
