const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  album: {
    type: String,
    trim: true
  },
  genre: {
    type: String,
    required: true,
    enum: ['pop', 'rock', 'hip-hop', 'jazz', 'classical', 'electronic', 'country', 'blues', 'reggae', 'folk', 'other']
  },
  duration: {
    type: Number,
    required: true // in seconds
  },
  filePath: {
    type: String,
    required: true
  },
  coverArt: {
    type: String,
    default: '/images/default-album-cover.png'
  },
  lyrics: {
    type: String,
    default: ''
  },
  releaseYear: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  language: {
    type: String,
    default: 'English'
  },
  explicit: {
    type: Boolean,
    default: false
  },
  playCount: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [String],
  mood: {
    type: String,
    enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic', 'motivational']
  },
  bpm: Number,
  key: String,
  quality: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  fileSize: Number, // in bytes
  bitrate: Number, // in kbps
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  metadata: {
    composer: String,
    producer: String,
    label: String,
    copyright: String,
    isrc: String // International Standard Recording Code
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for search functionality
songSchema.index({ title: 'text', artist: 'text', album: 'text', genre: 'text' });
songSchema.index({ genre: 1 });
songSchema.index({ artist: 1 });
songSchema.index({ releaseYear: 1 });
songSchema.index({ playCount: -1 });
songSchema.index({ createdAt: -1 });

// Virtual for like count
songSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for dislike count
songSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

// Method to increment play count
songSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  return this.save();
};

// Method to toggle like
songSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  const dislikeIndex = this.dislikes.indexOf(userId);
  
  if (likeIndex > -1) {
    // Remove like
    this.likes.splice(likeIndex, 1);
  } else {
    // Add like and remove dislike if exists
    this.likes.push(userId);
    if (dislikeIndex > -1) {
      this.dislikes.splice(dislikeIndex, 1);
    }
  }
  
  return this.save();
};

// Method to toggle dislike
songSchema.methods.toggleDislike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  const dislikeIndex = this.dislikes.indexOf(userId);
  
  if (dislikeIndex > -1) {
    // Remove dislike
    this.dislikes.splice(dislikeIndex, 1);
  } else {
    // Add dislike and remove like if exists
    this.dislikes.push(userId);
    if (likeIndex > -1) {
      this.likes.splice(likeIndex, 1);
    }
  }
  
  return this.save();
};

// Static method to get trending songs
songSchema.statics.getTrending = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ playCount: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username avatar');
};

// Static method to get featured songs
songSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isActive: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username avatar');
};

// Static method to search songs
songSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    ...filters
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery)
    .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .populate('uploadedBy', 'username avatar');
};

module.exports = mongoose.model('Song', songSchema);
