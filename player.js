/**
 * SoundMax Audio Player Engine
 * 
 * HOW TO ADD REAL AUDIO TRACKS:
 * 1. Place your MP3, WAV, or FLAC audio files in an 'audio/' folder in this project.
 * 2. Update the 'src' property for any track in the TRACKS array below:
 *    Example: src: "audio/midnight-odyssey.mp3"
 * 3. When 'src' is provided and valid, SoundMax plays the real audio file.
 *    When 'src' is empty, SoundMax uses the built-in Web Audio demo synthesizer
 *    to generate pleasant acoustic chords and frequencies for instant demonstration.
 */

const TRACKS = [
  {
    id: 1,
    title: "Midnight Odyssey",
    artist: "SoundMax Acoustic Lab",
    genre: "Spatial Ambient",
    duration: "3:42",
    durationSec: 222,
    cover: "image/album-midnight.png",
    format: "FLAC 96kHz · 24-bit",
    description: "Deep sub-bass drone with crystal harmonic overtone testing.",
    frequencies: [55, 110, 220, 440, 660],
    src: ""
  },
  {
    id: 2,
    title: "Resonance No. 4",
    artist: "Elysian Chamber Strings",
    genre: "Neo-Classical",
    duration: "4:15",
    durationSec: 255,
    cover: "image/album-resonance.png",
    format: "DSD 5.6MHz Master",
    description: "Wide stereo separation and acoustic string resonance.",
    frequencies: [65.4, 130.8, 196, 261.6, 392],
    src: ""
  },
  {
    id: 3,
    title: "Sub-Zero Wave",
    artist: "Kroma Electronics",
    genre: "Sub-Bass Synth",
    duration: "2:58",
    durationSec: 178,
    cover: "image/album-subzero.png",
    format: "Lossless Studio WAV",
    description: "Low-frequency transient response with tight punch.",
    frequencies: [43.65, 87.3, 174.6, 349.2, 523],
    src: ""
  },
  {
    id: 4,
    title: "Velvet Groove",
    artist: "Saffron Soul Quintet",
    genre: "Warm Analog Jazz",
    duration: "3:30",
    durationSec: 210,
    cover: "image/album-velvet.png",
    format: "Master Tape Transfer",
    description: "Silky vocal mids and warm analog harmonic saturation.",
    frequencies: [58.27, 116.5, 174.6, 233, 349.2],
    src: ""
  }
];

class SoundMaxPlayer {
  constructor() {
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = TRACKS[0].durationSec;
    this.volume = 0.8;
    this.isMuted = false;
    
    // Audio elements & Web Audio API context
    this.audioElement = new Audio();
    this.audioCtx = null;
    this.synthGain = null;
    this.synthOscillators = [];
    this.analyser = null;
    this.dataArray = null;
    this.timerInterval = null;
    
    this.initDOM();
    this.bindEvents();
    this.loadTrack(0, false);
    this.initVisualizer();
  }

  initDOM() {
    this.playBtn = document.getElementById('play-btn');
    this.playIcon = document.getElementById('play-icon');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.heroPlayBtn = document.getElementById('hero-listen-btn');
    this.progressBar = document.getElementById('player-progress');
    this.progressFill = document.getElementById('player-progress-fill');
    this.currentTimeEl = document.getElementById('player-current-time');
    this.totalTimeEl = document.getElementById('player-total-time');
    this.volumeSlider = document.getElementById('player-volume');
    this.volumeBtn = document.getElementById('volume-btn');
    this.volumeIcon = document.getElementById('volume-icon');
    
    this.titleEl = document.getElementById('player-track-title');
    this.artistEl = document.getElementById('player-track-artist');
    this.coverEl = document.getElementById('player-track-cover');
    this.formatEl = document.getElementById('player-track-format');
    this.demoBadge = document.getElementById('player-demo-badge');
    this.canvas = document.getElementById('visualizer-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        this.synthGain = this.audioCtx.createGain();
        this.synthGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.synthGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  loadTrack(index, autoplay = false) {
    if (index < 0) index = TRACKS.length - 1;
    if (index >= TRACKS.length) index = 0;
    
    this.currentTrackIndex = index;
    const track = TRACKS[index];
    this.duration = track.durationSec;
    this.currentTime = 0;
    
    if (this.titleEl) this.titleEl.textContent = track.title;
    if (this.artistEl) this.artistEl.textContent = track.artist;
    if (this.formatEl) this.formatEl.textContent = track.format;
    if (this.coverEl) {
      this.coverEl.src = track.cover;
      this.coverEl.alt = `${track.title} album cover`;
    }
    if (this.totalTimeEl) this.totalTimeEl.textContent = track.duration;
    if (this.currentTimeEl) this.currentTimeEl.textContent = "0:00";
    if (this.progressBar) this.progressBar.value = 0;
    if (this.progressFill) this.progressFill.style.width = '0%';
    
    // Update active highlight on track rows
    document.querySelectorAll('.track-row, .music-card').forEach((row, i) => {
      const playBtnText = row.querySelector('.track-play-state, .card-play-state');
      if (i === index) {
        row.classList.add('is-active');
        if (playBtnText) {
          playBtnText.textContent = this.isPlaying ? 'Playing' : 'Selected';
          playBtnText.classList.add('btn-accent');
          playBtnText.classList.remove('btn-surface');
        }
      } else {
        row.classList.remove('is-active');
        if (playBtnText) {
          playBtnText.textContent = 'Play';
          playBtnText.classList.remove('btn-accent');
          playBtnText.classList.add('btn-surface');
        }
      }
    });

    // Check if real audio source is specified
    if (track.src && track.src.trim() !== '') {
      this.audioElement.src = track.src;
      this.audioElement.load();
      if (this.demoBadge) {
        this.demoBadge.textContent = 'Master Audio File';
        this.demoBadge.classList.add('badge-real');
      }
    } else {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      if (this.demoBadge) {
        this.demoBadge.textContent = 'Demo Synthesizer Audio (Add MP3 in player.js)';
        this.demoBadge.classList.remove('badge-real');
      }
    }

    if (autoplay) {
      this.play();
    } else if (this.isPlaying) {
      this.play();
    }
  }

  play() {
    this.ensureAudioContext();
    this.isPlaying = true;
    this.updatePlayStateUI(true);

    const track = TRACKS[this.currentTrackIndex];
    if (track.src && track.src.trim() !== '') {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
      this.audioElement.currentTime = this.currentTime;
      this.audioElement.play().catch(() => {
        // Fallback to synth if file not accessible
        this.startSynth(track);
      });
    } else {
      this.startSynth(track);
    }

    this.startProgressTimer();
  }

  pause() {
    this.isPlaying = false;
    this.updatePlayStateUI(false);
    
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSynth();
    this.stopProgressTimer();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  startSynth(track) {
    if (!this.audioCtx || !this.synthGain) return;
    this.stopSynth();

    const now = this.audioCtx.currentTime;
    const baseFreqs = track.frequencies || [55, 110, 220, 330];
    const targetGain = this.isMuted ? 0 : this.volume * 0.15;

    this.synthOscillators = baseFreqs.map((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
      const filter = this.audioCtx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 250, now);

      if (panner) {
        panner.pan.setValueAtTime((idx / (baseFreqs.length - 1)) * 1.4 - 0.7, now);
        osc.connect(filter);
        filter.connect(panner);
        panner.connect(this.synthGain);
      } else {
        osc.connect(filter);
        filter.connect(this.synthGain);
      }

      osc.start(now);
      return osc;
    });

    this.synthGain.gain.cancelScheduledValues(now);
    this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, now);
    this.synthGain.gain.linearRampToValueAtTime(targetGain, now + 0.3);
  }

  stopSynth() {
    if (!this.audioCtx || !this.synthGain) return;
    const now = this.audioCtx.currentTime;
    this.synthGain.gain.cancelScheduledValues(now);
    this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, now);
    this.synthGain.gain.linearRampToValueAtTime(0, now + 0.15);

    setTimeout(() => {
      this.synthOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      this.synthOscillators = [];
    }, 180);
  }

  updatePlayStateUI(playing) {
    if (this.playIcon) {
      if (playing) {
        this.playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';
      } else {
        this.playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>';
      }
    }
    
    // Update card badges
    const activeCard = document.querySelector(`.music-card[data-index="${this.currentTrackIndex}"]`);
    if (activeCard) {
      const stateEl = activeCard.querySelector('.card-play-state');
      if (stateEl) stateEl.textContent = playing ? 'Playing' : 'Paused';
    }
  }

  startProgressTimer() {
    this.stopProgressTimer();
    this.timerInterval = setInterval(() => {
      if (!this.isPlaying) return;
      this.currentTime += 0.5;
      if (this.currentTime >= this.duration) {
        this.nextTrack();
        return;
      }
      this.updateProgressUI();
    }, 500);
  }

  stopProgressTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateProgressUI() {
    const fraction = Math.min(1, this.currentTime / this.duration);
    if (this.progressBar) this.progressBar.value = fraction * 100;
    if (this.progressFill) this.progressFill.style.width = `${fraction * 100}%`;
    if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(this.currentTime);
  }

  seek(percent) {
    this.currentTime = (percent / 100) * this.duration;
    if (this.audioElement && this.audioElement.src) {
      this.audioElement.currentTime = this.currentTime;
    }
    this.updateProgressUI();
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.synthGain && this.audioCtx && this.isPlaying) {
      const now = this.audioCtx.currentTime;
      this.synthGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.15, now);
    }
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    if (!this.volumeIcon) return;
    if (this.isMuted || this.volume === 0) {
      this.volumeIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>';
    } else {
      this.volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2"/>';
    }
  }

  prevTrack() {
    const prevIndex = (this.currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    this.loadTrack(prevIndex, this.isPlaying);
  }

  nextTrack() {
    const nextIndex = (this.currentTrackIndex + 1) % TRACKS.length;
    this.loadTrack(nextIndex, this.isPlaying);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  bindEvents() {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => this.togglePlay());
    }
    if (this.heroPlayBtn) {
      this.heroPlayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const playerSec = document.getElementById('player');
        if (playerSec) {
          playerSec.scrollIntoView({ behavior: 'smooth' });
        }
        if (!this.isPlaying) {
          setTimeout(() => this.play(), 300);
        }
      });
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prevTrack());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.nextTrack());
    }
    if (this.progressBar) {
      this.progressBar.addEventListener('input', (e) => {
        this.seek(parseFloat(e.target.value));
      });
    }
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value) / 100);
      });
    }
    if (this.volumeBtn) {
      this.volumeBtn.addEventListener('click', () => this.toggleMute());
    }

    // Track Row and Card Click Listeners
    document.querySelectorAll('.track-row, .music-card').forEach((row) => {
      row.addEventListener('click', (e) => {
        const index = parseInt(row.getAttribute('data-index'), 10);
        if (index === this.currentTrackIndex) {
          this.togglePlay();
        } else {
          this.loadTrack(index, true);
        }
      });
    });

    // Keyboard controls (Space to toggle play)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }

  initVisualizer() {
    if (!this.canvas || !this.ctx) return;
    const canvas = this.canvas;
    const ctx = this.ctx;
    
    // Fit canvas DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 280) * dpr;
    canvas.height = (rect.height || 48) * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;

    const render = () => {
      requestAnimationFrame(render);
      const w = rect.width || 280;
      const h = rect.height || 48;
      ctx.clearRect(0, 0, w, h);

      const barCount = 28;
      const barWidth = 3;
      const gap = (w - barCount * barWidth) / (barCount - 1);

      if (this.isPlaying) {
        phase += 0.08;
      }

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        let barHeight;

        if (this.isPlaying) {
          // Dynamic harmonic height based on frequency and phase
          const wave1 = Math.sin(phase + i * 0.35);
          const wave2 = Math.cos(phase * 1.3 + i * 0.2);
          const raw = (wave1 + wave2 + 2) / 4;
          barHeight = Math.max(4, raw * (h - 8));
        } else {
          // Resting serene pulse
          barHeight = 4 + Math.sin(i * 0.5) * 2;
        }

        const y = h - barHeight;
        // Warm gold tone: #e5b85a
        ctx.fillStyle = this.isPlaying ? '#e5b85a' : '#4a4f59';
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    render();
  }
}

// Staggered section entrance animations for polished smooth motion
function initEntranceObserver() {
  const elements = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => observer.observe(el));
}

// Pricing tier selection feedback
function initPricingSelect() {
  const buttons = document.querySelectorAll('.pricing-card button');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.pricing-card');
      const tierName = card ? card.querySelector('h3').textContent : 'Selected Tier';
      buttons.forEach(b => {
        b.textContent = 'Select';
        b.classList.remove('btn-selected');
      });
      btn.textContent = 'Selected ✓';
      btn.classList.add('btn-selected');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.soundMaxPlayer = new SoundMaxPlayer();
  initEntranceObserver();
  initPricingSelect();
});
