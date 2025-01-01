// TuneForge - Main JavaScript

// Global variables
let currentSong = null;
let currentPlaylist = null;
let isPlaying = false;
let currentTime = 0;
let duration = 0;
let volume = 0.8;
let isShuffled = false;
let repeatMode = 'none'; // none, all, one
let playQueue = [];
let currentQueueIndex = 0;

// DOM elements
const audioElement = document.getElementById('audioElement');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressSlider = document.getElementById('progressSlider');
const progressFill = document.getElementById('progressFill');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const queueBtn = document.getElementById('queueBtn');
const queueModal = document.getElementById('queueModal');
const queueList = document.getElementById('queueList');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAudioPlayer();
    initializeEventListeners();
    initializeFlashMessages();
    initializeSearch();
    initializeTheme();
    loadUserPreferences();
});

// Audio Player Functions
function initializeAudioPlayer() {
    if (!audioElement) return;
    
    // Set initial volume
    audioElement.volume = volume;
    volumeSlider.value = volume * 100;
    
    // Audio event listeners
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleSongEnded);
    audioElement.addEventListener('error', handleAudioError);
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('waiting', handleWaiting);
    audioElement.addEventListener('playing', handlePlaying);
    audioElement.addEventListener('pause', handlePause);
}

function initializeEventListeners() {
    // Play/Pause button
    if (playBtn) {
        playBtn.addEventListener('click', togglePlayPause);
    }
    
    // Previous/Next buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', playPrevious);
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', playNext);
    }
    
    // Progress slider
    if (progressSlider) {
        progressSlider.addEventListener('input', handleProgressChange);
    }
    
    // Volume controls
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
    if (volumeBtn) {
        volumeBtn.addEventListener('click', toggleMute);
    }
    
    // Shuffle and repeat
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', toggleShuffle);
    }
    if (repeatBtn) {
        repeatBtn.addEventListener('click', toggleRepeat);
    }
    
    // Queue modal
    if (queueBtn) {
        queueBtn.addEventListener('click', toggleQueueModal);
    }
    
    // Modal close
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeQueueModal);
    }
    
    // Close modal on outside click
    if (queueModal) {
        queueModal.addEventListener('click', function(e) {
            if (e.target === queueModal) {
                closeQueueModal();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Audio event handlers
function handleLoadedMetadata() {
    duration = audioElement.duration;
    totalTimeDisplay.textContent = formatTime(duration);
    progressSlider.max = duration;
}

function handleTimeUpdate() {
    currentTime = audioElement.currentTime;
    const progress = (currentTime / duration) * 100;
    
    progressFill.style.width = progress + '%';
    progressSlider.value = currentTime;
    currentTimeDisplay.textContent = formatTime(currentTime);
}

function handleSongEnded() {
    if (repeatMode === 'one') {
        audioElement.currentTime = 0;
        audioElement.play();
    } else if (repeatMode === 'all' || currentQueueIndex < playQueue.length - 1) {
        playNext();
    } else {
        stop();
    }
}

function handleAudioError(e) {
    console.error('Audio error:', e);
    showNotification('Error playing audio file', 'error');
}

function handleCanPlay() {
    // Audio is ready to play
}

function handleWaiting() {
    // Show loading state
}

function handlePlaying() {
    isPlaying = true;
    updatePlayButton();
}

function handlePause() {
    isPlaying = false;
    updatePlayButton();
}

// Playback controls
function togglePlayPause() {
    if (!currentSong) return;
    
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    if (!audioElement || !currentSong) return;
    
    audioElement.play().catch(error => {
        console.error('Play failed:', error);
        showNotification('Unable to play audio', 'error');
    });
}

function pause() {
    if (audioElement) {
        audioElement.pause();
    }
}

function stop() {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    isPlaying = false;
    updatePlayButton();
}

function playPrevious() {
    if (currentQueueIndex > 0) {
        currentQueueIndex--;
        loadSong(playQueue[currentQueueIndex]);
    }
}

function playNext() {
    if (currentQueueIndex < playQueue.length - 1) {
        currentQueueIndex++;
        loadSong(playQueue[currentQueueIndex]);
    } else if (repeatMode === 'all') {
        currentQueueIndex = 0;
        loadSong(playQueue[currentQueueIndex]);
    }
}

// Song loading
function loadSong(song) {
    if (!song) return;
    
    currentSong = song;
    
    // Update UI
    updatePlayerInfo(song);
    
    // Load audio
    if (audioElement) {
        audioElement.src = `/songs/${song._id}/stream`;
        audioElement.load();
    }
    
    // Update queue display
    updateQueueDisplay();
}

function updatePlayerInfo(song) {
    const titleElement = document.getElementById('playerTitle');
    const artistElement = document.getElementById('playerArtist');
    const coverElement = document.getElementById('playerCover');
    
    if (titleElement) titleElement.textContent = song.title;
    if (artistElement) artistElement.textContent = song.artist;
    if (coverElement) {
        coverElement.src = song.coverArt || '/images/default-album-cover.png';
        coverElement.alt = song.title;
    }
}

// Progress controls
function handleProgressChange() {
    if (!audioElement) return;
    
    const newTime = parseFloat(progressSlider.value);
    audioElement.currentTime = newTime;
    currentTime = newTime;
}

// Volume controls
function handleVolumeChange() {
    volume = volumeSlider.value / 100;
    if (audioElement) {
        audioElement.volume = volume;
    }
    updateVolumeButton();
}

function toggleMute() {
    if (volume > 0) {
        volume = 0;
    } else {
        volume = 0.8;
    }
    
    if (audioElement) {
        audioElement.volume = volume;
    }
    
    volumeSlider.value = volume * 100;
    updateVolumeButton();
}

function updateVolumeButton() {
    if (!volumeBtn) return;
    
    const icon = volumeBtn.querySelector('i');
    if (volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

// Shuffle and repeat
function toggleShuffle() {
    isShuffled = !isShuffled;
    updateShuffleButton();
    
    if (isShuffled && playQueue.length > 1) {
        shuffleQueue();
    }
}

function toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    updateRepeatButton();
}

function updateShuffleButton() {
    if (!shuffleBtn) return;
    
    if (isShuffled) {
        shuffleBtn.classList.add('active');
    } else {
        shuffleBtn.classList.remove('active');
    }
}

function updateRepeatButton() {
    if (!repeatBtn) return;
    
    repeatBtn.className = 'control-btn';
    const icon = repeatBtn.querySelector('i');
    
    switch (repeatMode) {
        case 'all':
            icon.className = 'fas fa-redo';
            repeatBtn.classList.add('active');
            break;
        case 'one':
            icon.className = 'fas fa-redo';
            repeatBtn.classList.add('active');
            repeatBtn.title = 'Repeat One';
            break;
        default:
            icon.className = 'fas fa-redo';
            repeatBtn.title = 'Repeat';
    }
}

// Queue management
function addToQueue(song) {
    playQueue.push(song);
    updateQueueDisplay();
}

function removeFromQueue(index) {
    playQueue.splice(index, 1);
    if (currentQueueIndex >= index && currentQueueIndex > 0) {
        currentQueueIndex--;
    }
    updateQueueDisplay();
}

function clearQueue() {
    playQueue = [];
    currentQueueIndex = 0;
    updateQueueDisplay();
}

function shuffleQueue() {
    if (playQueue.length <= 1) return;
    
    const currentSong = playQueue[currentQueueIndex];
    const otherSongs = playQueue.filter((_, index) => index !== currentQueueIndex);
    
    // Shuffle other songs
    for (let i = otherSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
    }
    
    // Rebuild queue with current song first
    playQueue = [currentSong, ...otherSongs];
    currentQueueIndex = 0;
    updateQueueDisplay();
}

function updateQueueDisplay() {
    if (!queueList) return;
    
    queueList.innerHTML = '';
    
    playQueue.forEach((song, index) => {
        const queueItem = document.createElement('div');
        queueItem.className = `queue-item ${index === currentQueueIndex ? 'active' : ''}`;
        queueItem.innerHTML = `
            <div class="song-cover">
                <img src="${song.coverArt || '/images/default-album-cover.png'}" alt="${song.title}">
            </div>
            <div class="song-details">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-duration">${formatTime(song.duration || 0)}</div>
        `;
        
        queueItem.addEventListener('click', () => {
            currentQueueIndex = index;
            loadSong(song);
            play();
        });
        
        queueList.appendChild(queueItem);
    });
}

// Queue modal
function toggleQueueModal() {
    if (queueModal) {
        queueModal.classList.toggle('active');
    }
}

function closeQueueModal() {
    if (queueModal) {
        queueModal.classList.remove('active');
    }
}

// UI updates
function updatePlayButton() {
    if (!playBtn) return;
    
    const icon = playBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
}

// Utility functions
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Global play function (called from song cards)
window.playSong = function(songId) {
    fetch(`/api/songs/${songId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const song = data.data;
                
                // Add to queue if not already playing
                if (!currentSong || currentSong._id !== song._id) {
                    if (playQueue.length === 0) {
                        playQueue = [song];
                        currentQueueIndex = 0;
                    } else {
                        // Add to queue if not already there
                        const existingIndex = playQueue.findIndex(s => s._id === song._id);
                        if (existingIndex === -1) {
                            playQueue.push(song);
                            currentQueueIndex = playQueue.length - 1;
                        } else {
                            currentQueueIndex = existingIndex;
                        }
                    }
                    
                    loadSong(song);
                    play();
                } else {
                    togglePlayPause();
                }
            } else {
                showNotification('Error loading song', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error loading song', 'error');
        });
};

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (e.ctrlKey) {
                playPrevious();
            } else {
                // Seek backward 10 seconds
                if (audioElement) {
                    audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
                }
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (e.ctrlKey) {
                playNext();
            } else {
                // Seek forward 10 seconds
                if (audioElement) {
                    audioElement.currentTime = Math.min(duration, audioElement.currentTime + 10);
                }
            }
            break;
        case 'KeyM':
            e.preventDefault();
            toggleMute();
            break;
        case 'KeyS':
            e.preventDefault();
            toggleShuffle();
            break;
        case 'KeyR':
            e.preventDefault();
            toggleRepeat();
            break;
    }
}

// Flash messages
function initializeFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        const closeBtn = message.querySelector('.flash-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                message.remove();
            });
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            message.remove();
        }, 5000);
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 300);
            }
        });
    }
}

function performSearch(query) {
    // This could be enhanced with live search suggestions
    console.log('Searching for:', query);
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// User preferences
function loadUserPreferences() {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume) {
        volume = parseFloat(savedVolume);
        if (audioElement) {
            audioElement.volume = volume;
        }
        if (volumeSlider) {
            volumeSlider.value = volume * 100;
        }
    }
    
    const savedShuffle = localStorage.getItem('shuffle');
    if (savedShuffle) {
        isShuffled = savedShuffle === 'true';
        updateShuffleButton();
    }
    
    const savedRepeat = localStorage.getItem('repeat');
    if (savedRepeat) {
        repeatMode = savedRepeat;
        updateRepeatButton();
    }
}

function saveUserPreferences() {
    localStorage.setItem('volume', volume.toString());
    localStorage.setItem('shuffle', isShuffled.toString());
    localStorage.setItem('repeat', repeatMode);
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Save preferences when they change
document.addEventListener('beforeunload', saveUserPreferences);

// Export functions for global access
window.TuneForge = {
    playSong,
    addToQueue,
    clearQueue,
    toggleTheme,
    showNotification
};
