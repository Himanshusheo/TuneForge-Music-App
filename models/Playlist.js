const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  coverImage: {
    type: String,
    default: '/images/default-playlist-cover.png'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'editor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  songs: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  tags: [String],
  category: {
    type: String,
    enum: ['personal', 'mood', 'genre', 'activity', 'decade', 'other'],
    default: 'personal'
  },
  playCount: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic', 'motivational']
  },
  duration: {
    type: Number,
    default: 0 // total duration in seconds
  },
  lastPlayed: Date,
  settings: {
    shuffle: {
      type: Boolean,
      default: false
    },
    repeat: {
      type: String,
      enum: ['none', 'all', 'one'],
      default: 'none'
    },
    autoplay: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
playlistSchema.index({ createdBy: 1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ category: 1 });
playlistSchema.index({ playCount: -1 });
playlistSchema.index({ createdAt: -1 });
playlistSchema.index({ name: 'text', description: 'text' });

// Virtual for song count
playlistSchema.virtual('songCount').get(function() {
  return this.songs.length;
});

// Virtual for like count
playlistSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for follower count
playlistSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Method to add song to playlist
playlistSchema.methods.addSong = function(songId, userId) {
  // Check if song already exists
  const existingSong = this.songs.find(s => s.song.toString() === songId.toString());
  if (existingSong) {
    throw new Error('Song already exists in playlist');
  }
  
  const maxOrder = this.songs.length > 0 ? Math.max(...this.songs.map(s => s.order)) : 0;
  
  this.songs.push({
    song: songId,
    addedBy: userId,
    order: maxOrder + 1,
    addedAt: new Date()
  });
  
  return this.save();
};

// Method to remove song from playlist
playlistSchema.methods.removeSong = function(songId) {
  this.songs = this.songs.filter(s => s.song.toString() !== songId.toString());
  return this.save();
};

// Method to reorder songs
playlistSchema.methods.reorderSongs = function(songOrders) {
  songOrders.forEach(({ songId, newOrder }) => {
    const song = this.songs.find(s => s.song.toString() === songId.toString());
    if (song) {
      song.order = newOrder;
    }
  });
  
  // Sort songs by order
  this.songs.sort((a, b) => a.order - b.order);
  return this.save();
};

// Method to add collaborator
playlistSchema.methods.addCollaborator = function(userId, role = 'editor') {
  const existingCollaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (existingCollaborator) {
    existingCollaborator.role = role;
  } else {
    this.collaborators.push({
      user: userId,
      role,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove collaborator
playlistSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => c.user.toString() !== userId.toString());
  return this.save();
};

// Method to check if user can edit playlist
playlistSchema.methods.canEdit = function(userId) {
  if (this.createdBy.toString() === userId.toString()) return true;
  if (!this.isCollaborative) return false;
  
  const collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  return collaborator && collaborator.role === 'editor';
};

// Method to check if user can view playlist
playlistSchema.methods.canView = function(userId) {
  if (this.isPublic) return true;
  if (this.createdBy.toString() === userId.toString()) return true;
  
  const collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  return collaborator !== undefined;
};

// Method to increment play count
playlistSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

// Method to toggle like
playlistSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  
  return this.save();
};

// Method to toggle follow
playlistSchema.methods.toggleFollow = function(userId) {
  const followIndex = this.followers.indexOf(userId);
  
  if (followIndex > -1) {
    this.followers.splice(followIndex, 1);
  } else {
    this.followers.push(userId);
  }
  
  return this.save();
};

// Static method to get public playlists
playlistSchema.statics.getPublic = function(limit = 20, skip = 0) {
  return this.find({ isPublic: true })
    .sort({ playCount: -1 })
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'username avatar')
    .populate('songs.song', 'title artist duration coverArt');
};

// Static method to get featured playlists
playlistSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isPublic: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .populate('songs.song', 'title artist duration coverArt');
};

// Pre-save middleware to calculate total duration
playlistSchema.pre('save', async function(next) {
  if (this.songs.length > 0) {
    const Song = mongoose.model('Song');
    const songIds = this.songs.map(s => s.song);
    const songs = await Song.find({ _id: { $in: songIds } });
    
    this.duration = songs.reduce((total, song) => total + song.duration, 0);
  }
  next();
});

module.exports = mongoose.model('Playlist', playlistSchema);
