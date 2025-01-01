// TuneForge - Audio Player Enhanced Features

// Advanced audio player functionality
class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.visualizer = null;
        this.isInitialized = false;
        this.audioBuffer = null;
        this.source = null;
        this.gainNode = null;
        this.filters = [];
        this.equalizer = null;
        this.crossfade = false;
        this.crossfadeDuration = 3000; // 3 seconds
    }

    // Initialize Web Audio API
    async initializeWebAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.gainNode = this.audioContext.createGain();
            
            // Configure analyser
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            // Create equalizer
            this.createEqualizer();
            
            // Connect nodes
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Web Audio API initialization failed:', error);
            return false;
        }
    }

    // Create equalizer with multiple bands
    createEqualizer() {
        this.equalizer = {
            low: this.audioContext.createBiquadFilter(),
            mid: this.audioContext.createBiquadFilter(),
            high: this.audioContext.createBiquadFilter()
        };

        // Configure filters
        this.equalizer.low.type = 'lowshelf';
        this.equalizer.low.frequency.setValueAtTime(100, this.audioContext.currentTime);
        
        this.equalizer.mid.type = 'peaking';
        this.equalizer.mid.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        this.equalizer.mid.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        this.equalizer.high.type = 'highshelf';
        this.equalizer.high.frequency.setValueAtTime(3000, this.audioContext.currentTime);

        // Connect equalizer
        this.equalizer.low.connect(this.equalizer.mid);
        this.equalizer.mid.connect(this.equalizer.high);
        this.equalizer.high.connect(this.gainNode);
    }

    // Set equalizer values
    setEqualizer(low = 0, mid = 0, high = 0) {
        if (!this.equalizer) return;

        this.equalizer.low.gain.setValueAtTime(low, this.audioContext.currentTime);
        this.equalizer.mid.gain.setValueAtTime(mid, this.audioContext.currentTime);
        this.equalizer.high.gain.setValueAtTime(high, this.audioContext.currentTime);
    }

    // Create audio visualizer
    createVisualizer(canvas) {
        if (!this.analyser || !canvas) return;

        this.visualizer = canvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const draw = () => {
            requestAnimationFrame(draw);

            this.analyser.getByteFrequencyData(this.dataArray);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / this.dataArray.length) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < this.dataArray.length; i++) {
                barHeight = (this.dataArray[i] / 255) * height;

                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
    }

    // Crossfade between songs
    async crossfadeToNewSong(newAudioSrc) {
        if (!this.crossfade || !this.audioContext) {
            return false;
        }

        try {
            // Create new source
            const newSource = this.audioContext.createBufferSource();
            const newGain = this.audioContext.createGain();
            
            // Load new audio
            const response = await fetch(newAudioSrc);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            newSource.buffer = audioBuffer;
            newSource.connect(newGain);
            newGain.connect(this.equalizer.low);
            
            // Start crossfade
            const currentTime = this.audioContext.currentTime;
            
            // Fade out current
            this.gainNode.gain.setValueAtTime(1, currentTime);
            this.gainNode.gain.linearRampToValueAtTime(0, currentTime + this.crossfadeDuration / 1000);
            
            // Fade in new
            newGain.gain.setValueAtTime(0, currentTime);
            newGain.gain.linearRampToValueAtTime(1, currentTime + this.crossfadeDuration / 1000);
            
            // Start new source
            newSource.start(currentTime);
            
            // Update references
            this.source = newSource;
            this.gainNode = newGain;
            
            return true;
        } catch (error) {
            console.error('Crossfade failed:', error);
            return false;
        }
    }

    // Get audio features for analysis
    getAudioFeatures() {
        if (!this.analyser) return null;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate RMS (Root Mean Square) for volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / this.dataArray.length);
        
        // Calculate spectral centroid (brightness)
        let weightedSum = 0;
        let magnitudeSum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            weightedSum += i * this.dataArray[i];
            magnitudeSum += this.dataArray[i];
        }
        const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
        
        return {
            volume: rms / 255,
            brightness: spectralCentroid / this.dataArray.length,
            frequencyData: Array.from(this.dataArray)
        };
    }

    // Apply audio effects
    applyReverb(roomSize = 0.5, dampening = 0.5) {
        if (!this.audioContext) return;

        const convolver = this.audioContext.createConvolver();
        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, dampening);
                channelData[i] = (Math.random() * 2 - 1) * decay * roomSize;
            }
        }
        
        convolver.buffer = impulse;
        convolver.connect(this.gainNode);
    }

    applyDelay(delayTime = 0.3, feedback = 0.3) {
        if (!this.audioContext) return;

        const delay = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        delay.delayTime.setValueAtTime(delayTime, this.audioContext.currentTime);
        feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);
        
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);
        delay.connect(this.gainNode);
    }

    // Audio normalization
    normalizeAudio(buffer) {
        const samples = buffer.getChannelData(0);
        let max = 0;
        
        // Find maximum amplitude
        for (let i = 0; i < samples.length; i++) {
            max = Math.max(max, Math.abs(samples[i]));
        }
        
        // Normalize if needed
        if (max > 0) {
            const factor = 0.95 / max; // Leave some headroom
            for (let i = 0; i < samples.length; i++) {
                samples[i] *= factor;
            }
        }
        
        return buffer;
    }

    // Get audio waveform data
    getWaveformData(buffer, samples = 1000) {
        const channelData = buffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const waveform = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[i * blockSize + j]);
            }
            waveform.push(sum / blockSize);
        }
        
        return waveform;
    }

    // Audio format detection
    detectAudioFormat(url) {
        const extension = url.split('.').pop().toLowerCase();
        const formats = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4'
        };
        
        return formats[extension] || 'audio/mpeg';
    }

    // Audio quality detection
    async detectAudioQuality(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            const contentType = response.headers.get('content-type');
            
            if (contentLength) {
                const sizeInMB = parseInt(contentLength) / (1024 * 1024);
                
                // Estimate quality based on file size and duration
                // This is a rough estimation
                if (sizeInMB > 10) return 'high';
                if (sizeInMB > 5) return 'medium';
                return 'low';
            }
            
            return 'unknown';
        } catch (error) {
            console.error('Quality detection failed:', error);
            return 'unknown';
        }
    }

    // Audio fingerprinting for duplicate detection
    async generateAudioFingerprint(buffer) {
        if (!buffer) return null;

        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const duration = buffer.duration;
        
        // Simple fingerprint based on audio characteristics
        const fingerprint = {
            duration: duration,
            sampleRate: sampleRate,
            channels: buffer.numberOfChannels,
            // Add more sophisticated fingerprinting here
            hash: this.simpleHash(channelData.slice(0, 1000)) // First 1000 samples
        };
        
        return fingerprint;
    }

    simpleHash(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
        }
        return hash.toString(16);
    }

    // Cleanup
    destroy() {
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.visualizer = null;
        this.isInitialized = false;
    }
}

// Initialize enhanced audio player
let enhancedPlayer = null;

document.addEventListener('DOMContentLoaded', function() {
    enhancedPlayer = new AudioPlayer();
    
    // Initialize Web Audio API when user interacts
    document.addEventListener('click', async function() {
        if (!enhancedPlayer.isInitialized) {
            await enhancedPlayer.initializeWebAudio();
        }
    }, { once: true });
});

// Export for global access
window.EnhancedAudioPlayer = AudioPlayer;
window.enhancedPlayer = enhancedPlayer;
