// TuneForge - Search Functionality

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchTimeout = null;
        this.currentQuery = '';
        this.searchHistory = [];
        this.suggestions = [];
        this.isSearching = false;
        this.searchCache = new Map();
        this.maxCacheSize = 100;
        this.debounceDelay = 300;
    }

    initialize() {
        this.searchInput = document.querySelector('.search-input');
        this.searchResults = document.querySelector('.search-results');
        
        if (this.searchInput) {
            this.setupEventListeners();
            this.loadSearchHistory();
        }
    }

    setupEventListeners() {
        // Input event with debouncing
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Form submission
        const searchForm = this.searchInput.closest('form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch(this.searchInput.value);
            });
        }

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Focus events
        this.searchInput.addEventListener('focus', () => {
            this.showSuggestions();
        });

        this.searchInput.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                this.hideSuggestions();
            }, 200);
        });
    }

    handleSearchInput(query) {
        this.currentQuery = query.trim();
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Show suggestions for non-empty queries
        if (this.currentQuery.length > 0) {
            this.searchTimeout = setTimeout(() => {
                this.getSuggestions(this.currentQuery);
            }, this.debounceDelay);
        } else {
            this.hideSuggestions();
        }
    }

    async getSuggestions(query) {
        if (query.length < 2) return;

        try {
            // Check cache first
            if (this.searchCache.has(query)) {
                this.displaySuggestions(this.searchCache.get(query));
                return;
            }

            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=5`);
            const data = await response.json();

            if (data.success) {
                const suggestions = this.formatSuggestions(data.data.results);
                this.searchCache.set(query, suggestions);
                
                // Limit cache size
                if (this.searchCache.size > this.maxCacheSize) {
                    const firstKey = this.searchCache.keys().next().value;
                    this.searchCache.delete(firstKey);
                }

                this.displaySuggestions(suggestions);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }

    formatSuggestions(results) {
        const suggestions = [];
        
        // Add songs
        if (results.songs && results.songs.length > 0) {
            suggestions.push({
                type: 'section',
                title: 'Songs',
                items: results.songs.slice(0, 3).map(song => ({
                    type: 'song',
                    id: song._id,
                    title: song.title,
                    artist: song.artist,
                    coverArt: song.coverArt,
                    duration: song.duration
                }))
            });
        }

        // Add playlists
        if (results.playlists && results.playlists.length > 0) {
            suggestions.push({
                type: 'section',
                title: 'Playlists',
                items: results.playlists.slice(0, 2).map(playlist => ({
                    type: 'playlist',
                    id: playlist._id,
                    title: playlist.name,
                    description: playlist.description,
                    songCount: playlist.songCount,
                    coverImage: playlist.coverImage
                }))
            });
        }

        // Add artists
        if (results.users && results.users.length > 0) {
            suggestions.push({
                type: 'section',
                title: 'Artists',
                items: results.users.slice(0, 2).map(user => ({
                    type: 'artist',
                    id: user._id,
                    title: user.username,
                    name: `${user.firstName} ${user.lastName}`,
                    avatar: user.avatar
                }))
            });
        }

        return suggestions;
    }

    displaySuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        // Create suggestions container if it doesn't exist
        let suggestionsContainer = document.querySelector('.search-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'search-suggestions';
            this.searchInput.parentNode.appendChild(suggestionsContainer);
        }

        // Build suggestions HTML
        let html = '';
        suggestions.forEach(section => {
            html += `<div class="suggestion-section">
                <div class="suggestion-section-title">${section.title}</div>
                <div class="suggestion-items">`;
            
            section.items.forEach(item => {
                html += this.createSuggestionItem(item);
            });
            
            html += `</div></div>`;
        });

        // Add search history if query is empty
        if (this.currentQuery === '' && this.searchHistory.length > 0) {
            html += `<div class="suggestion-section">
                <div class="suggestion-section-title">Recent Searches</div>
                <div class="suggestion-items">`;
            
            this.searchHistory.slice(0, 5).forEach(query => {
                html += `<div class="suggestion-item suggestion-history" data-query="${query}">
                    <i class="fas fa-history"></i>
                    <span>${query}</span>
                </div>`;
            });
            
            html += `</div></div>`;
        }

        suggestionsContainer.innerHTML = html;
        suggestionsContainer.style.display = 'block';

        // Add click handlers
        this.addSuggestionClickHandlers(suggestionsContainer);
    }

    createSuggestionItem(item) {
        let html = `<div class="suggestion-item" data-type="${item.type}" data-id="${item.id}">`;
        
        switch (item.type) {
            case 'song':
                html += `
                    <div class="suggestion-cover">
                        <img src="${item.coverArt || '/images/default-album-cover.png'}" alt="${item.title}">
                    </div>
                    <div class="suggestion-info">
                        <div class="suggestion-title">${item.title}</div>
                        <div class="suggestion-subtitle">${item.artist}</div>
                    </div>
                    <div class="suggestion-duration">${this.formatDuration(item.duration)}</div>
                `;
                break;
                
            case 'playlist':
                html += `
                    <div class="suggestion-cover">
                        <img src="${item.coverImage || '/images/default-playlist-cover.png'}" alt="${item.title}">
                    </div>
                    <div class="suggestion-info">
                        <div class="suggestion-title">${item.title}</div>
                        <div class="suggestion-subtitle">${item.songCount} songs</div>
                    </div>
                `;
                break;
                
            case 'artist':
                html += `
                    <div class="suggestion-avatar">
                        <img src="${item.avatar || '/images/default-avatar.png'}" alt="${item.title}">
                    </div>
                    <div class="suggestion-info">
                        <div class="suggestion-title">${item.title}</div>
                        <div class="suggestion-subtitle">${item.name}</div>
                    </div>
                `;
                break;
        }
        
        html += `</div>`;
        return html;
    }

    addSuggestionClickHandlers(container) {
        const items = container.querySelectorAll('.suggestion-item');
        
        items.forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const id = item.dataset.id;
                const query = item.dataset.query;
                
                if (query) {
                    // Search history item clicked
                    this.searchInput.value = query;
                    this.performSearch(query);
                } else if (type && id) {
                    // Navigate to item
                    this.navigateToItem(type, id);
                }
                
                this.hideSuggestions();
            });
        });
    }

    navigateToItem(type, id) {
        switch (type) {
            case 'song':
                window.location.href = `/songs/${id}`;
                break;
            case 'playlist':
                window.location.href = `/playlists/${id}`;
                break;
            case 'artist':
                window.location.href = `/users/${id}`;
                break;
        }
    }

    handleKeyboardNavigation(e) {
        const suggestions = document.querySelector('.search-suggestions');
        if (!suggestions || suggestions.style.display === 'none') return;

        const items = suggestions.querySelectorAll('.suggestion-item');
        const activeItem = suggestions.querySelector('.suggestion-item.active');
        let activeIndex = -1;

        if (activeItem) {
            activeIndex = Array.from(items).indexOf(activeItem);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                this.setActiveSuggestion(items, activeIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, -1);
                this.setActiveSuggestion(items, activeIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    activeItem.click();
                } else {
                    this.performSearch(this.currentQuery);
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                this.searchInput.blur();
                break;
        }
    }

    setActiveSuggestion(items, index) {
        items.forEach(item => item.classList.remove('active'));
        if (index >= 0 && index < items.length) {
            items[index].classList.add('active');
        }
    }

    async performSearch(query) {
        if (!query.trim()) return;

        this.isSearching = true;
        this.addToSearchHistory(query);
        
        // Show loading state
        this.showSearchLoading();

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all`);
            const data = await response.json();

            if (data.success) {
                this.displaySearchResults(data.data);
            } else {
                this.showSearchError('Search failed. Please try again.');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Network error. Please check your connection.');
        } finally {
            this.isSearching = false;
            this.hideSearchLoading();
        }
    }

    displaySearchResults(data) {
        // This would typically navigate to a search results page
        // For now, we'll redirect to the songs search page
        window.location.href = `/songs/search?q=${encodeURIComponent(data.query)}`;
    }

    showSearchLoading() {
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }

    hideSearchLoading() {
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        }
    }

    showSearchError(message) {
        // Show error notification
        if (window.TuneForge && window.TuneForge.showNotification) {
            window.TuneForge.showNotification(message, 'error');
        }
    }

    hideSuggestions() {
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    showSuggestions() {
        if (this.currentQuery.length > 0) {
            this.getSuggestions(this.currentQuery);
        } else if (this.searchHistory.length > 0) {
            this.displaySuggestions([]);
        }
    }

    addToSearchHistory(query) {
        // Remove if already exists
        const index = this.searchHistory.indexOf(query);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Limit history size
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        this.saveSearchHistory();
    }

    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('tuneforge_search_history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('tuneforge_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.hideSuggestions();
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize search manager
let searchManager = null;

document.addEventListener('DOMContentLoaded', function() {
    searchManager = new SearchManager();
    searchManager.initialize();
});

// Export for global access
window.SearchManager = SearchManager;
window.searchManager = searchManager;
