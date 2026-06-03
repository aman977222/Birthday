/* ==========================================
   HAPPY BIRTHDAY PAGE LOGIC & ANIMATIONS
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------------------
    // 1. STATE & AUDIO SYNTHESIZER
    // ----------------------------------------------------------------
    let audioContext = null;
    let synthPlaying = false;
    let nextNoteTimeout = null;
    let isMuted = true;
    let micStream = null;
    let micAnalyser = null;
    let micInterval = null;

    // Happy Birthday Song Notes & Durations
    // [NoteName, Octave, Duration (1 = quarter, 0.5 = eighth, 1.5 = dotted quarter, etc.)]
    const birthdayMelody = [
        ['C', 4, 0.75], ['C', 4, 0.25], ['D', 4, 1], ['C', 4, 1], ['F', 4, 1], ['E', 4, 2],
        ['C', 4, 0.75], ['C', 4, 0.25], ['D', 4, 1], ['C', 4, 1], ['G', 4, 1], ['F', 4, 2],
        ['C', 4, 0.75], ['C', 4, 0.25], ['C', 5, 1], ['A', 4, 1], ['F', 4, 1], ['E', 4, 1], ['D', 4, 2],
        ['A#', 4, 0.75], ['A#', 4, 0.25], ['A', 4, 1], ['F', 4, 1], ['G', 4, 1], ['F', 4, 2]
    ];

    // Frequencies mapping
    const noteFreqs = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00
    };

    let currentNoteIndex = 0;
    const tempo = 120; // Beats per minute
    const beatDuration = 60 / tempo; // 1 beat in seconds

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playTone(freq, duration, type = 'sine') {
        if (!audioContext || isMuted) return;

        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);

        // Gentle envelope to avoid clicks
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration - 0.05);

        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);

        osc.start();
        osc.stop(audioContext.currentTime + duration);
    }

    function playMelodyStep() {
        if (!synthPlaying || isMuted) return;

        const noteInfo = birthdayMelody[currentNoteIndex];
        const noteName = noteInfo[0] + noteInfo[1];
        const durationBeats = noteInfo[2];
        const durationSeconds = durationBeats * beatDuration;
        const freq = noteFreqs[noteName];

        if (freq) {
            // Play lead synth note
            playTone(freq, durationSeconds, 'triangle');
            // Play a soft backing chord/harmony on alternate beats for richer sound
            if (currentNoteIndex % 3 === 0) {
                playTone(freq / 2, durationSeconds * 2, 'sine'); // Sub bass harmony
            }
        }

        currentNoteIndex = (currentNoteIndex + 1) % birthdayMelody.length;

        // Schedule next note
        nextNoteTimeout = setTimeout(playMelodyStep, durationSeconds * 1000);
    }

    const audioEl = document.getElementById('birthday-song');

    function startMusic() {
        initAudio();
        isMuted = false;

        // Try playing custom MP3 first
        if (audioEl && audioEl.src && !audioEl.src.endsWith('#')) {
            audioEl.play()
                .then(() => {
                    synthPlaying = false; // Disable synth since MP3 is playing
                    updateMusicUI();
                })
                .catch((err) => {
                    console.warn("Custom MP3 play failed, falling back to synthesizer.", err);
                    playSynthesizer();
                });
        } else {
            playSynthesizer();
        }
    }

    function playSynthesizer() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        synthPlaying = true;
        currentNoteIndex = 0;
        playMelodyStep();
        updateMusicUI();
    }

    function stopMusic() {
        synthPlaying = false;
        if (nextNoteTimeout) {
            clearTimeout(nextNoteTimeout);
        }
        if (audioEl) {
            audioEl.pause();
        }
        updateMusicUI();
    }

    function updateMusicUI() {
        const muteIcon = document.querySelector('.mute-icon');
        const playIcon = document.querySelector('.play-icon');
        const tooltip = document.querySelector('.music-tooltip');
        const isMp3Playing = audioEl && !audioEl.paused;

        if (isMuted || (!synthPlaying && !isMp3Playing)) {
            muteIcon.classList.remove('hidden');
            playIcon.classList.add('hidden');
            tooltip.textContent = "Play Music! 🎵";
        } else {
            muteIcon.classList.add('hidden');
            playIcon.classList.remove('hidden');
            tooltip.textContent = "Mute Music 🔇";
        }
    }

    // Toggle Music
    const musicBtn = document.getElementById('music-toggle-btn');
    musicBtn.addEventListener('click', () => {
        const isMp3Playing = audioEl && !audioEl.paused;
        if (isMuted || (!synthPlaying && !isMp3Playing)) {
            isMuted = false;
            startMusic();
        } else {
            isMuted = true;
            stopMusic();
        }
    });

    // ----------------------------------------------------------------
    // 2. ENVELOPE / CARD OPENING ANIMATION
    // ----------------------------------------------------------------
    const envelope = document.querySelector('.envelope');
    const openBtn = document.getElementById('open-envelope-btn');
    const envelopeWrapper = document.getElementById('card-envelope-wrapper');
    const mainContent = document.getElementById('main-content');

    // Clicking the seal or button opens the letter
    openBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent duplicate trigger
        openEnvelope();
    });

    envelope.addEventListener('click', () => {
        if (!envelope.classList.contains('open')) {
            openEnvelope();
        }
    });

    function openEnvelope() {
        envelope.classList.add('open');

        // Launch a small confetti first
        triggerConfetti(0.5, 0.4, 40);

        // Wait for envelope animation to finish, then show main page
        setTimeout(() => {
            envelopeWrapper.classList.add('fade-out');
            mainContent.classList.remove('hidden');

            // Start happy music
            startMusic();

            // Huge confetti celebration explosion
            setTimeout(() => {
                triggerConfettiExplosion();
            }, 500);

            // Populate images, start balloon generator, stars
            startInteractiveElements();
        }, 1200);
    }

    // ----------------------------------------------------------------
    // 3. BACKGROUND EFFECTS (BALLOONS & STARS)
    // ----------------------------------------------------------------
    const balloonContainer = document.getElementById('balloon-container');
    const starsContainer = document.getElementById('stars-container');

    const balloonColors = [
        '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
        '#e11d48', '#10b981', '#f59e0b', '#d97706'
    ];

    function createBalloon() {
        if (!balloonContainer) return;
        const balloon = document.createElement('div');
        balloon.classList.add('balloon');

        const size = Math.floor(Math.random() * 25) + 35; // 35px - 60px
        const left = Math.random() * 100; // 0% - 100%
        const delay = Math.random() * 5;
        const duration = Math.random() * 8 + 8; // 8s - 16s
        const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];

        balloon.style.width = `${size}px`;
        balloon.style.height = `${size * 1.2}px`;
        balloon.style.left = `${left}%`;
        balloon.style.animationDelay = `${delay}s`;
        balloon.style.animationDuration = `${duration}s`;
        balloon.style.backgroundColor = color;
        balloon.style.boxShadow = `inset -7px -7px 15px rgba(0,0,0,0.3), 0 10px 20px rgba(${hexToRgb(color)},0.3)`;

        // Balloon click pops it!
        balloon.addEventListener('click', () => {
            popBalloon(balloon);
        });

        balloonContainer.appendChild(balloon);

        // Remove balloon after animation completes
        setTimeout(() => {
            balloon.remove();
        }, (duration + delay) * 1000);
    }

    function popBalloon(balloon) {
        // Pop sound synthesize
        initAudio();
        playTone(600, 0.08, 'sine');
        playTone(150, 0.12, 'sawtooth');

        // Confetti burst at balloon position
        const rect = balloon.getBoundingClientRect();
        const x = rect.left / window.innerWidth;
        const y = rect.top / window.innerHeight;
        triggerConfetti(x, y, 15);

        balloon.remove();
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '255, 255, 255';
    }

    function createStars() {
        if (!starsContainer) return;
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('div');
            star.classList.add('twinkle-star');
            const size = Math.random() * 3 + 1; // 1px - 4px
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            const duration = Math.random() * 3 + 2; // 2s - 5s
            const delay = Math.random() * 4;

            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.top = `${top}%`;
            star.style.left = `${left}%`;
            star.style.animationDuration = `${duration}s`;
            star.style.animationDelay = `${delay}s`;

            starsContainer.appendChild(star);
        }
    }

    function startInteractiveElements() {
        createStars();
        // Spawns balloons periodically
        setInterval(createBalloon, 800);
        // Load Unsplash photos for polaroid cards
        loadPhotos();
    }

    // ----------------------------------------------------------------
    // 4. INTERACTIVE BIRTHDAY CAKE & MIC BLOWING
    // ----------------------------------------------------------------
    const candles = document.querySelectorAll('.candle');
    const micBtn = document.getElementById('mic-enable-btn');
    const micStatusText = document.getElementById('mic-status');
    const cakeWishes = document.getElementById('cake-wishes');

    // Click candles to blow them out manually
    candles.forEach(candle => {
        candle.addEventListener('click', () => {
            blowOutCandle(candle);
        });
    });

    function blowOutCandle(candle) {
        if (!candle.classList.contains('blown-out')) {
            candle.classList.add('blown-out');
            candle.classList.remove('active-candle');

            // Synthesize puff blow sound
            initAudio();
            playTone(80, 0.15, 'triangle'); // Low rumble

            // Small confetti spray from the candle
            const rect = candle.getBoundingClientRect();
            triggerConfetti(rect.left / window.innerWidth, rect.top / window.innerHeight, 15);

            checkAllCandlesBlown();
        }
    }

    function checkAllCandlesBlown() {
        const activeCandles = document.querySelectorAll('.active-candle');
        if (activeCandles.length === 0) {
            // All blown out! Show custom wishes and trigger massive confetti
            setTimeout(() => {
                cakeWishes.classList.remove('hidden');
                triggerConfettiExplosion();
                // Synthesize cheers
                initAudio();
                playTone(330, 0.15, 'sine');
                playTone(440, 0.15, 'sine');
                playTone(550, 0.15, 'sine');
                playTone(660, 0.4, 'sine');
            }, 600);
        }
    }

    // Microphone Blowing Detection
    micBtn.addEventListener('click', async () => {
        initAudio();
        if (micStream) {
            // Turn off mic
            stopMicrophone();
            return;
        }

        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micAnalyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(micStream);
            source.connect(micAnalyser);
            micAnalyser.fftSize = 256;

            micBtn.innerHTML = `<i class="fa-solid fa-microphone-slash"></i> Turn Off Mic`;
            micBtn.style.background = "var(--danger-color)";
            micStatusText.textContent = "Microphone is Active! Blow 💨";
            micStatusText.style.color = "var(--success-color)";

            const bufferLength = micAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Periodically check input volume
            micInterval = setInterval(() => {
                micAnalyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                let average = sum / bufferLength;

                // Threshold for a blowing sound (volume spike)
                if (average > 55) {
                    blowRandomCandle();
                }
            }, 100);

        } catch (err) {
            console.warn('Microphone access denied or unavailable:', err);
            micStatusText.textContent = "Microphone access denied. Click candles to blow out!";
            micStatusText.style.color = "var(--danger-color)";
        }
    });

    function stopMicrophone() {
        if (micInterval) clearInterval(micInterval);
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        micBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> Enable Mic to Blow out Candles`;
        micBtn.style.background = "rgba(255, 255, 255, 0.1)";
        micStatusText.textContent = "Microphone is Off";
        micStatusText.style.color = "var(--text-secondary)";
    }

    function blowRandomCandle() {
        const activeCandles = Array.from(document.querySelectorAll('.active-candle'));
        if (activeCandles.length > 0) {
            // Blow one random candle
            const randomIndex = Math.floor(Math.random() * activeCandles.length);
            blowOutCandle(activeCandles[randomIndex]);
        } else {
            stopMicrophone(); // Turn off mic if all blown out
        }
    }

    // ----------------------------------------------------------------
    // 5. PHOTO GALLERY LOADER
    // ----------------------------------------------------------------
    function loadPhotos() {
        // Local high-quality generated images
        const photoUrls = [
            "images/boy_childhood.png",
            "images/boy_style.png",
            "images/boy_smiling.png",
            "images/boy_party.png"
        ];

        photoUrls.forEach((url, index) => {
            const img = document.getElementById(`polaroid-img-${index + 1}`);
            if (img) {
                img.src = url;
                img.onload = () => {
                    // Hide placeholder and reveal image
                    const container = img.closest('.polaroid-img-container');
                    container.classList.add('img-loaded');
                    img.style.opacity = "1";
                };
            }
        });
    }



    // ----------------------------------------------------------------
    // Confetti Helper Functions
    // ----------------------------------------------------------------
    function triggerConfetti(x, y, count) {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: count,
                spread: 60,
                origin: { x: x, y: y },
                colors: ['#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#10b981']
            });
        }
    }

    function triggerConfettiExplosion() {
        if (typeof confetti === 'function') {
            // Left burst
            confetti({
                particleCount: 80,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: ['#06b6d4', '#6366f1', '#f59e0b', '#ec4899']
            });
            // Right burst
            confetti({
                particleCount: 80,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: ['#06b6d4', '#6366f1', '#f59e0b', '#ec4899']
            });
        }
    }
});
