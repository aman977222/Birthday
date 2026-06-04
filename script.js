const firebaseConfig = {
  apiKey: "AIzaSyAIwpXfJOrVq7lYbrcysDdxF7LMIlMCJx8",
  authDomain: "brithday-ca653.firebaseapp.com",
  projectId: "brithday-ca653",
  storageBucket: "brithday-ca653.firebasestorage.app",
  messagingSenderId: "680039525305",
  appId: "1:680039525305:web:7ab80c7d1816cd39882468",
  measurementId: "G-WXCP7C51XM"
};

// Initialize Firebase Database
let db = null;
let useFirebase = false;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        useFirebase = true;
        console.log("Firebase Database initialized successfully!");
    } else {
        console.warn("Firebase SDK not loaded. Offline mode.");
    }
} catch (e) {
    console.warn("Failed to initialize Firebase database, falling back to LocalStorage:", e);
}

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
        
        if (typeof updateCCMusicUI === 'function') {
            updateCCMusicUI();
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

    const musicTooltip = document.querySelector('.music-tooltip');
    if (musicTooltip) {
        musicTooltip.style.cursor = 'pointer';
        musicTooltip.addEventListener('click', () => {
            if (activeSessionRole) {
                openDashboard(activeSessionRole);
            } else {
                const modal = document.getElementById('control-center-modal');
                modal.classList.remove('hidden');
                updateCCMusicUI();
            }
        });
    }

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

    async function startInteractiveElements() {
        const activeProfile = await getActiveProfile();
        startParticles(activeProfile.particleType);
        await loadPhotos();
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
    async function loadPhotos() {
        const activeProfile = await getActiveProfile();
        if (!activeProfile || !activeProfile.polaroids) return;
        
        activeProfile.polaroids.forEach((pol, index) => {
            const img = document.getElementById(`polaroid-img-${index + 1}`);
            if (!img) return;
            
            const card = img.closest('.polaroid-card');
            const caption = card ? card.querySelector('.polaroid-caption') : null;
            
            if (caption) {
                caption.textContent = pol.caption || `Memory ${index + 1} 📸`;
            }
            
            img.src = pol.img;
            img.onload = () => {
                const container = img.closest('.polaroid-img-container');
                if (container) container.classList.add('img-loaded');
                img.style.opacity = "1";
            };
            if (img.complete) {
                const container = img.closest('.polaroid-img-container');
                if (container) container.classList.add('img-loaded');
                img.style.opacity = "1";
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

    // ----------------------------------------------------------------
    // 6. DYNAMIC PROFILE DATABASE & THEMING SYSTEM (ADMIN / SUPER ADMIN)
    // ----------------------------------------------------------------
    const DEFAULT_PROFILES = [
        {
            id: "default",
            name: "Aman",
            relation: "Dear Brother",
            subtitle: "Sending you lots of love and warm wishes on your special day! 🎉",
            ticker: "✨ Happy Birthday! | ✨ Live happy always! | ✨ May God give you success! | ✨ Live for thousands of years! | ✨ Happy Birthday to the coolest boy!",
            profileImg: "images/aman.png",
            polaroids: [
                { img: "images/boy_childhood.png", caption: "Sweet Childhood 👶" },
                { img: "images/boy_style.png", caption: "Cool Dude 😎" },
                { img: "images/boy_smiling.png", caption: "Keep Smiling Always 😄" },
                { img: "images/boy_party.png", caption: "Party Time! 🕺" }
            ],
            theme: "midnight",
            particleType: "balloons",
            songUrl: "song.mp3"
        }
    ];

    const DEFAULT_CREDENTIALS = {
        admin: { username: "admin", password: "" },
        superadmin: { username: "superadmin", password: "" },
        users: []
    };

    const themeStyles = {
        midnight: {
            '--bg-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
            '--primary-color': '#06b6d4',
            '--secondary-color': '#6366f1',
            '--accent-color': '#f59e0b'
        },
        sunset: {
            '--bg-gradient': 'linear-gradient(135deg, #2e0854 0%, #8b0000 50%, #ff8c00 100%)',
            '--primary-color': '#ec4899',
            '--secondary-color': '#f43f5e',
            '--accent-color': '#f59e0b'
        },
        royal: {
            '--bg-gradient': 'linear-gradient(135deg, #000000 0%, #1e1b4b 50%, #b59410 100%)',
            '--primary-color': '#b59410',
            '--secondary-color': '#6366f1',
            '--accent-color': '#e11d48'
        },
        rose: {
            '--bg-gradient': 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #fda4af 100%)',
            '--primary-color': '#fb7185',
            '--secondary-color': '#db2777',
            '--accent-color': '#fbbf24'
        }
    };

    // Cache variables
    let cachedProfiles = null;
    let cachedActiveProfileId = null;
    let cachedCredentials = null;

    // Profiles DB getters & setters
    async function getProfiles(forceRefresh = false) {
        if (cachedProfiles && !forceRefresh) {
            return cachedProfiles;
        }
        if (useFirebase && db) {
            try {
                const querySnapshot = await db.collection("profiles").get();
                const profiles = [];
                querySnapshot.forEach((docSnap) => {
                    profiles.push(docSnap.data());
                });
                if (profiles.length > 0) {
                    // Sync to local storage
                    localStorage.setItem('birthday_profiles', JSON.stringify(profiles));
                    cachedProfiles = profiles;
                    return profiles;
                }
            } catch (e) {
                console.warn("Error reading profiles from Firestore, using LocalStorage:", e);
            }
        }
        const p = localStorage.getItem('birthday_profiles');
        cachedProfiles = p ? JSON.parse(p) : DEFAULT_PROFILES;
        return cachedProfiles;
    }

    async function saveProfile(profile) {
        // Update local cache and local storage first
        if (!cachedProfiles) cachedProfiles = [];
        const idx = cachedProfiles.findIndex(p => p.id === profile.id);
        if (idx !== -1) {
            cachedProfiles[idx] = profile;
        } else {
            cachedProfiles.push(profile);
        }
        localStorage.setItem('birthday_profiles', JSON.stringify(cachedProfiles));

        // Update Firestore in background
        if (useFirebase && db) {
            try {
                await db.collection("profiles").doc(profile.id).set(profile);
            } catch (e) {
                console.error("Firestore write profile failed:", e);
            }
        }
    }

    async function deleteProfile(profileId) {
        // Update local cache and local storage first
        if (cachedProfiles) {
            cachedProfiles = cachedProfiles.filter(p => p.id !== profileId);
        }
        let profiles = await getProfiles();
        profiles = profiles.filter(p => p.id !== profileId);
        localStorage.setItem('birthday_profiles', JSON.stringify(profiles));

        // Update Firestore in background
        if (useFirebase && db) {
            try {
                await db.collection("profiles").doc(profileId).delete();
            } catch (e) {
                console.error("Firestore delete profile failed:", e);
            }
        }
    }

    async function getActiveProfileId(forceRefresh = false) {
        if (cachedActiveProfileId && !forceRefresh) {
            return cachedActiveProfileId;
        }
        if (useFirebase && db) {
            try {
                const docSnap = await db.collection("settings").doc("active_profile").get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    localStorage.setItem('birthday_active_profile_id', data.activeId);
                    cachedActiveProfileId = data.activeId;
                    return data.activeId;
                }
            } catch (e) {
                console.warn("Error reading active profile ID from Firestore:", e);
            }
        }
        cachedActiveProfileId = localStorage.getItem('birthday_active_profile_id') || 'default';
        return cachedActiveProfileId;
    }

    async function setActiveProfileId(id) {
        cachedActiveProfileId = id;
        localStorage.setItem('birthday_active_profile_id', id);
        if (useFirebase && db) {
            try {
                await db.collection("settings").doc("active_profile").set({ activeId: id });
            } catch (e) {
                console.error("Firestore write active profile ID failed:", e);
            }
        }
    }

    async function getActiveProfile() {
        const profiles = await getProfiles();
        const activeId = await getActiveProfileId();
        return profiles.find(p => p.id === activeId) || profiles[0] || DEFAULT_PROFILES[0];
    }

    async function getCredentials(forceRefresh = false) {
        if (cachedCredentials && !forceRefresh) {
            return cachedCredentials;
        }
        if (useFirebase && db) {
            try {
                const docSnap = await db.collection("settings").doc("credentials").get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    localStorage.setItem('birthday_credentials', JSON.stringify(data));
                    cachedCredentials = data;
                    return data;
                }
            } catch (e) {
                console.warn("Error reading credentials from Firestore:", e);
            }
        }
        const c = localStorage.getItem('birthday_credentials');
        cachedCredentials = c ? JSON.parse(c) : DEFAULT_CREDENTIALS;
        return cachedCredentials;
    }

    async function saveCredentials(creds) {
        cachedCredentials = creds;
        localStorage.setItem('birthday_credentials', JSON.stringify(creds));
        if (useFirebase && db) {
            try {
                await db.collection("settings").doc("credentials").set(creds);
            } catch (e) {
                console.error("Firestore write credentials failed:", e);
            }
        }
    }

    function applyTheme(themeName) {
        const vars = themeStyles[themeName] || themeStyles.midnight;
        for (const [prop, val] of Object.entries(vars)) {
            document.documentElement.style.setProperty(prop, val);
        }
    }

    // Floating particles engine
    let particleInterval = null;
    function startParticles(type) {
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = null;
        }
        if (balloonContainer) balloonContainer.innerHTML = '';
        if (starsContainer) starsContainer.innerHTML = '';

        if (type === 'stars') {
            createStars();
        } else if (type === 'balloons') {
            particleInterval = setInterval(createBalloon, 800);
        } else if (type === 'hearts') {
            particleInterval = setInterval(() => createFloatingEmoji('❤️'), 800);
        } else if (type === 'mixed') {
            const emojis = ['🎈', '❤️', '💖', '⭐', '✨', '🎉', '🎁', '🎂'];
            particleInterval = setInterval(() => {
                if (Math.random() > 0.5) {
                    createBalloon();
                } else {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    createFloatingEmoji(randomEmoji);
                }
            }, 800);
        }
    }

    function createFloatingEmoji(emoji) {
        if (!balloonContainer) return;
        const el = document.createElement('div');
        el.textContent = emoji;
        
        const size = Math.floor(Math.random() * 20) + 24; // 24px - 44px
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = Math.random() * 6 + 6; // 6s - 12s
        
        el.style.position = 'absolute';
        el.style.fontSize = `${size}px`;
        el.style.left = `${left}%`;
        el.style.bottom = '-100px';
        el.style.animation = `floatUp ${duration}s linear infinite`;
        el.style.animationDelay = `${delay}s`;
        el.style.cursor = 'pointer';
        el.style.userSelect = 'none';
        el.style.zIndex = '1';
        el.style.opacity = '0.85';
        
        el.addEventListener('click', () => {
            initAudio();
            playTone(800, 0.05, 'sine');
            const rect = el.getBoundingClientRect();
            triggerConfetti(rect.left / window.innerWidth, rect.top / window.innerHeight, 12);
            el.remove();
        });
        
        balloonContainer.appendChild(el);
        setTimeout(() => el.remove(), (duration + delay) * 1000);
    }

    // Render active profile configuration to DOM
    // Render active profile configuration to DOM
    async function loadActiveProfileData() {
        const activeProfile = await getActiveProfile();
        
        // Update basic details
        const nameEl = document.querySelector('.boy-name');
        if (nameEl) {
            nameEl.innerHTML = `${activeProfile.relation} <span class="highlight">${activeProfile.name}</span>`;
        }
        const subEl = document.querySelector('.birthday-sub');
        if (subEl) {
            subEl.textContent = activeProfile.subtitle;
        }
        const profileImgEl = document.querySelector('.hero-profile-img');
        if (profileImgEl) {
            profileImgEl.src = activeProfile.profileImg;
        }
        const tickerContent = document.querySelector('.ticker-content');
        if (tickerContent) {
            tickerContent.textContent = activeProfile.ticker;
        }
        const footerName = document.querySelector('.main-footer span.highlight');
        if (footerName) {
            footerName.textContent = activeProfile.name;
        }
        
        // Apply theme colors
        applyTheme(activeProfile.theme);
        
        // Update song URL
        if (audioEl) {
            const currentSrc = audioEl.getAttribute('src');
            if (currentSrc !== activeProfile.songUrl) {
                audioEl.src = activeProfile.songUrl;
                audioEl.load();
                if (!isMuted) {
                    audioEl.play().catch(e => console.log("Audio replay failed: ", e));
                }
            }
        }
        
        // Start correct particle engine if main content is visible
        if (mainContent && !mainContent.classList.contains('hidden')) {
            startParticles(activeProfile.particleType);
            await loadPhotos();
        }
    }

    // Initialize Database on Page Load
    async function initDatabaseAndLoad() {
        if (!localStorage.getItem('birthday_profiles')) {
            localStorage.setItem('birthday_profiles', JSON.stringify(DEFAULT_PROFILES));
        }
        if (!localStorage.getItem('birthday_credentials')) {
            localStorage.setItem('birthday_credentials', JSON.stringify(DEFAULT_CREDENTIALS));
        }
        if (!localStorage.getItem('birthday_active_profile_id')) {
            localStorage.setItem('birthday_active_profile_id', 'default');
        }

        // If firebase is active, seed the database if Firestore collection is empty
        if (useFirebase && db) {
            try {
                const querySnapshot = await db.collection("profiles").get();
                if (querySnapshot.empty) {
                    console.log("Firestore empty. Seeding DEFAULT_PROFILES...");
                    for (const p of DEFAULT_PROFILES) {
                        await db.collection("profiles").doc(p.id).set(p);
                    }
                    await db.collection("settings").doc("active_profile").set({ activeId: 'default' });
                    await db.collection("settings").doc("credentials").set(DEFAULT_CREDENTIALS);
                }
            } catch (e) {
                console.warn("Firestore seed failed (likely rules blocked write):", e);
            }
        }

        await loadActiveProfileData();
    }

    // Call init
    initDatabaseAndLoad();

    // ----------------------------------------------------------------
    // 7. CONTROL CENTER MODAL INTERACTION LOGIC
    // ----------------------------------------------------------------
    const ccModal = document.getElementById('control-center-modal');
    const closeCcBtn = document.getElementById('close-cc-btn');
    const ccPlayBtn = document.getElementById('cc-music-play-btn');
    const ccVolumeSlider = document.getElementById('cc-volume-slider');
    const ccLoginForm = document.getElementById('cc-login-form');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const togglePwBtn = document.getElementById('toggle-pw-visibility');
    const ccPasswordInput = document.getElementById('cc-password');
    const ccUsernameInput = document.getElementById('cc-username');

    // Open/Close Control Center
    closeCcBtn.addEventListener('click', () => {
        ccModal.classList.add('hidden');
        loginErrorMsg.classList.add('hidden');
        ccLoginForm.reset();
    });

    ccModal.querySelector('.cc-modal-backdrop').addEventListener('click', () => {
        ccModal.classList.add('hidden');
        loginErrorMsg.classList.add('hidden');
        ccLoginForm.reset();
    });

    // Sync volume slider on initial load
    if (audioEl) {
        ccVolumeSlider.value = audioEl.volume;
    }

    ccVolumeSlider.addEventListener('input', (e) => {
        if (audioEl) {
            audioEl.volume = e.target.value;
        }
    });

    ccPlayBtn.addEventListener('click', () => {
        const isMp3Playing = audioEl && !audioEl.paused;
        if (isMuted || (!synthPlaying && !isMp3Playing)) {
            isMuted = false;
            startMusic();
        } else {
            isMuted = true;
            stopMusic();
        }
        updateCCMusicUI();
    });

    function updateCCMusicUI() {
        const ccStatus = ccModal.querySelector('.music-status-text');
        const isMp3Playing = audioEl && !audioEl.paused;
        
        if (isMuted || (!synthPlaying && !isMp3Playing)) {
            ccPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            ccStatus.textContent = "Music is Paused";
        } else {
            ccPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            ccStatus.textContent = synthPlaying ? "Playing Synthesizer Melody 🎹" : "Playing Celebration Song 🎶";
        }
    }

    // Password Visibility Toggle
    togglePwBtn.addEventListener('click', () => {
        if (ccPasswordInput.type === 'password') {
            ccPasswordInput.type = 'text';
            togglePwBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        } else {
            ccPasswordInput.type = 'password';
            togglePwBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
        }
    });

    // Portal login submit authentication
    ccLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = ccUsernameInput.value.trim();
        const password = ccPasswordInput.value.trim();
        const creds = await getCredentials();

        let loggedIn = false;
        let role = null;

        if (creds.superadmin && creds.superadmin.username === username) {
            if (await verifyPassword(password, creds.superadmin.password)) {
                loggedIn = true;
                role = 'superadmin';
            }
        }
        
        if (!loggedIn && creds.admin && creds.admin.username === username) {
            if (await verifyPassword(password, creds.admin.password)) {
                loggedIn = true;
                role = 'admin';
            }
        }
        
        if (!loggedIn && creds.users && Array.isArray(creds.users)) {
            for (const user of creds.users) {
                if (user.username === username && await verifyPassword(password, user.password)) {
                    loggedIn = true;
                    role = user.role;
                    break;
                }
            }
        }

        if (loggedIn) {
            loginErrorMsg.classList.add('hidden');
            ccModal.classList.add('hidden');
            ccLoginForm.reset();
            openDashboard(role);
        } else {
            loginErrorMsg.classList.remove('hidden');
        }
    });

    // ----------------------------------------------------------------
    // 8. ADMIN / SUPER ADMIN DASHBOARD OPERATIONS
    // ----------------------------------------------------------------
    const dbOverlay = document.getElementById('admin-dashboard');
    const dbCloseBtn = document.getElementById('db-close-btn');
    const dbLogoutBtn = document.getElementById('db-logout-btn');
    const dbRoleBadge = document.getElementById('db-role-badge');
    const dbTabLinks = document.querySelectorAll('.db-tab-link');
    const dbTabContents = document.querySelectorAll('.db-tab-content');
    
    let activeSessionRole = null; // admin or superadmin

    async function openDashboard(role) {
        activeSessionRole = role;
        dbOverlay.classList.remove('hidden');
        
        // Setup Role UI
        dbRoleBadge.textContent = role === 'superadmin' ? 'Super Admin' : 'Admin';
        if (role === 'superadmin') {
            dbRoleBadge.className = 'db-badge sa-badge';
            document.querySelectorAll('.superadmin-only-tab').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.superadmin-only-card').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.admin-only-card').forEach(el => el.classList.add('hidden'));
            await renderSaUsersList();
        } else {
            dbRoleBadge.className = 'db-badge';
            document.querySelectorAll('.superadmin-only-tab').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.superadmin-only-card').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.admin-only-card').forEach(el => el.classList.remove('hidden'));
            
            // If active tab was profiles manager, switch to profile info
            const activeTab = document.querySelector('.db-tab-link.active');
            if (activeTab && activeTab.dataset.target === 'db-profiles-section') {
                switchDashboardTab('db-profile-section');
            }
        }
        
        // Populate profile edit form fields
        await populateDashboardForm();
        
        // Render profiles configuration list
        await renderProfilesTable();
    }

    function switchDashboardTab(targetSectionId) {
        dbTabLinks.forEach(link => {
            if (link.dataset.target === targetSectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        dbTabContents.forEach(content => {
            if (content.id === targetSectionId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    dbCloseBtn.addEventListener('click', () => {
        dbOverlay.classList.add('hidden');
    });

    const dbViewSiteBtn = document.getElementById('db-view-site-btn');
    if (dbViewSiteBtn) {
        dbViewSiteBtn.addEventListener('click', () => {
            dbOverlay.classList.add('hidden');
        });
    }

    dbLogoutBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to log out of the Admin Portal?")) {
            dbOverlay.classList.add('hidden');
            activeSessionRole = null;
        }
    });

    // Populate dashboard form from active profile config
    async function populateDashboardForm() {
        const activeProfile = await getActiveProfile();
        
        document.getElementById('edit-profile-name').value = activeProfile.name || "";
        document.getElementById('edit-profile-relation').value = activeProfile.relation || "";
        document.getElementById('edit-profile-subtitle').value = activeProfile.subtitle || "";
        document.getElementById('edit-profile-img-url').value = activeProfile.profileImg.startsWith('data:') ? "" : activeProfile.profileImg;
        document.getElementById('profile-img-preview').src = activeProfile.profileImg;
        delete document.getElementById('profile-img-preview').dataset.uploadedBase64;
        
        // Polaroids 1 to 4 safely mapped
        for (let i = 0; i < 4; i++) {
            const pol = activeProfile.polaroids && activeProfile.polaroids[i] ? activeProfile.polaroids[i] : null;
            document.getElementById(`pol-caption-${i + 1}`).value = pol ? (pol.caption || "") : "";
            
            const imgUrl = pol ? (pol.img || "") : "";
            document.getElementById(`pol-url-${i + 1}`).value = imgUrl.startsWith('data:') ? "" : imgUrl;
            document.getElementById(`pol-preview-${i + 1}`).src = imgUrl || "images/boy_childhood.png";
            delete document.getElementById(`pol-preview-${i + 1}`).dataset.uploadedBase64;
        }
        
        document.getElementById('edit-song-url').value = activeProfile.songUrl || "";
        document.getElementById('edit-ticker-text').value = activeProfile.ticker || "";
        document.getElementById('edit-particle-type').value = activeProfile.particleType || "balloons";
        
        // Theme preset active class
        const themeCards = document.querySelectorAll('.theme-preset-card');
        themeCards.forEach(card => {
            if (card.dataset.theme === activeProfile.theme) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    // Image Upload Handlers Setup
    function setupImageUpload(fileInputId, previewImgId, textInputId) {
        const fileInput = document.getElementById(fileInputId);
        const previewImg = document.getElementById(previewImgId);
        const textInput = document.getElementById(textInputId);
        
        if (!fileInput || !previewImg) return;
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    previewImg.src = base64;
                    if (textInput) {
                        textInput.value = "";
                    }
                    previewImg.dataset.uploadedBase64 = base64;
                };
                reader.readAsDataURL(file);
            }
        });
        
        if (textInput) {
            textInput.addEventListener('input', () => {
                if (textInput.value.trim() !== "") {
                    previewImg.src = textInput.value;
                    delete previewImg.dataset.uploadedBase64;
                }
            });
        }
    }

    // Setup uploads
    setupImageUpload('profile-img-file', 'profile-img-preview', 'edit-profile-img-url');
    setupImageUpload('pol-file-1', 'pol-preview-1', 'pol-url-1');
    setupImageUpload('pol-file-2', 'pol-preview-2', 'pol-url-2');
    setupImageUpload('pol-file-3', 'pol-preview-3', 'pol-url-3');
    setupImageUpload('pol-file-4', 'pol-preview-4', 'pol-url-4');

    // Theme selector click triggers
    const themePresetCards = document.querySelectorAll('.theme-preset-card');
    themePresetCards.forEach(card => {
        card.addEventListener('click', () => {
            themePresetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Section-based Save Actions
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.db-section-save-btn');
        if (btn) {
            await saveActiveProfileChanges(btn);
        }
    });

    async function saveActiveProfileChanges(btn) {
        const activeProfile = await getActiveProfile();
        const oldId = activeProfile.id;
        const newName = document.getElementById('edit-profile-name').value.trim();
        
        if (!newName) {
            alert("Profile name cannot be empty!");
            return;
        }

        const newId = newName === "Default Profile" ? "default" : newName;
        
        const updatedProfile = {
            id: newId,
            name: newName,
            relation: document.getElementById('edit-profile-relation').value.trim(),
            subtitle: document.getElementById('edit-profile-subtitle').value.trim(),
            profileImg: document.getElementById('profile-img-preview').dataset.uploadedBase64 || document.getElementById('edit-profile-img-url').value.trim() || activeProfile.profileImg,
            polaroids: [],
            songUrl: document.getElementById('edit-song-url').value.trim() || "song.mp3",
            ticker: document.getElementById('edit-ticker-text').value.trim(),
            particleType: document.getElementById('edit-particle-type').value,
            theme: activeProfile.theme
        };
        
        // Polaroids
        for (let i = 0; i < 4; i++) {
            const preview = document.getElementById(`pol-preview-${i + 1}`);
            const defaultImg = activeProfile.polaroids && activeProfile.polaroids[i] ? activeProfile.polaroids[i].img : "images/boy_childhood.png";
            updatedProfile.polaroids.push({
                img: preview.dataset.uploadedBase64 || document.getElementById(`pol-url-${i + 1}`).value.trim() || defaultImg,
                caption: document.getElementById(`pol-caption-${i + 1}`).value.trim()
            });
        }
        
        // Active theme Card
        const activeThemeCard = document.querySelector('.theme-preset-card.active');
        if (activeThemeCard) {
            updatedProfile.theme = activeThemeCard.dataset.theme;
        }
        
        // If ID (name) has changed, update active session ID to the new name ID, but do NOT delete the old profile document (keeps both)
        if (oldId !== newId) {
            await setActiveProfileId(newId);
        }
        
        // Save
        await saveProfile(updatedProfile);
        
        // Update DOM
        await loadActiveProfileData();
        await renderProfilesTable();
        
        // Visual button animation feedback
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Changes Saved!';
            btn.style.background = 'var(--success-color)';
            btn.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.style.transform = '';
                // Close dashboard overlay
                dbOverlay.classList.add('hidden');
            }, 1200);
        }
    }

    // Dashboard tab links
    dbTabLinks.forEach(link => {
        link.addEventListener('click', () => {
            switchDashboardTab(link.dataset.target);
        });
    });

    // Profiles manager table renderer
    async function renderProfilesTable() {
        const tbody = document.getElementById('profiles-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const profiles = await getProfiles();
        const activeId = await getActiveProfileId();
        
        profiles.forEach(profile => {
            const isActive = profile.id === activeId;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>
                    <a href="#" class="profile-name-link" style="color: var(--primary-color); font-weight: 600; text-decoration: none;" data-id="${profile.id}">
                        ${escapeHtml(profile.name)}
                    </a>
                </td>
                <td>${escapeHtml(profile.relation)}</td>
                <td>
                    <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    ${isActive ? `
                        <button class="btn-action btn-deactivate" title="Deactivate Profile" data-id="${profile.id}" style="background: var(--accent-color); color: var(--bg-dark);">
                            <i class="fa-solid fa-circle-xmark"></i> Deactivate
                        </button>
                    ` : `
                        <button class="btn-action btn-switch" title="Activate Profile" data-id="${profile.id}">
                            <i class="fa-solid fa-circle-check"></i> Activate
                        </button>
                    `}
                    ${profile.id !== 'default' ? `
                        <button class="btn-action btn-delete" title="Delete Profile" data-id="${profile.id}">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    ` : ''}
                </td>
            `;
            
            // Clicking name triggers activation/switching
            const nameLink = tr.querySelector('.profile-name-link');
            nameLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = nameLink.dataset.id;
                await setActiveProfileId(id);
                await loadActiveProfileData();
                await populateDashboardForm();
                await renderProfilesTable();
            });

            const switchBtn = tr.querySelector('.btn-switch');
            if (switchBtn) {
                switchBtn.addEventListener('click', async () => {
                    const id = switchBtn.dataset.id;
                    await setActiveProfileId(id);
                    await loadActiveProfileData();
                    await populateDashboardForm();
                    await renderProfilesTable();
                });
            }

            const deactivateBtn = tr.querySelector('.btn-deactivate');
            if (deactivateBtn) {
                deactivateBtn.addEventListener('click', async () => {
                    await setActiveProfileId('default');
                    await loadActiveProfileData();
                    await populateDashboardForm();
                    await renderProfilesTable();
                });
            }
            
            const deleteBtn = tr.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to delete profile for "${profile.name}"?`)) {
                        const id = deleteBtn.dataset.id;
                        await deleteProfile(id);
                        
                        if (await getActiveProfileId() === id) {
                            await setActiveProfileId('default');
                        }
                        
                        await loadActiveProfileData();
                        await populateDashboardForm();
                        await renderProfilesTable();
                    }
                });
            }
            
            tbody.appendChild(tr);
        });
    }
    
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // SHA-256 Hashing Utilities
    async function hashPassword(password) {
        if (!password) return "";
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyPassword(inputPassword, storedPasswordOrHash) {
        if (!storedPasswordOrHash) return false;
        const isHash = /^[a-f0-9]{64}$/i.test(storedPasswordOrHash);
        if (isHash) {
            const inputHash = await hashPassword(inputPassword);
            return inputHash === storedPasswordOrHash;
        } else {
            // Fallback for legacy plain-text passwords
            return inputPassword === storedPasswordOrHash;
        }
    }

    // Profiles manager profile creation
    const btnCreateProfile = document.getElementById('btn-create-profile');
    if (btnCreateProfile) {
        btnCreateProfile.addEventListener('click', async () => {
            const newName = prompt("Enter Name for the New Profile:", "Rohan");
            if (!newName || newName.trim() === "") return;
            const trimmedName = newName.trim();
            
            const profiles = await getProfiles();
            if (profiles.some(p => p.id.toLowerCase() === trimmedName.toLowerCase())) {
                alert("A profile with this name already exists!");
                return;
            }
            
            const newProfile = {
                id: trimmedName,
                name: trimmedName,
                relation: "Dear Friend",
                subtitle: `Sending you lots of love and warm wishes on your special day! 🎉`,
                ticker: "✨ Happy Birthday! | ✨ Live happy always! | ✨ May God give you success!",
                profileImg: "images/aman.png",
                polaroids: [
                    { img: "images/boy_childhood.png", caption: "Sweet Childhood 👶" },
                    { img: "images/boy_style.png", caption: "Cool Dude 😎" },
                    { img: "images/boy_smiling.png", caption: "Keep Smiling Always 😄" },
                    { img: "images/boy_party.png", caption: "Party Time! 🕺" }
                ],
                theme: "midnight",
                particleType: "balloons",
                songUrl: "song.mp3"
            };
            
            await saveProfile(newProfile);
            await setActiveProfileId(newProfile.id);
            
            await loadActiveProfileData();
            await populateDashboardForm();
            await renderProfilesTable();
            
            alert(`Profile for "${newName}" created and activated! You can now customize its details.`);
        });
    }

    // Change Admin password submit
    const formAdminPw = document.getElementById('form-change-admin-pw');
    formAdminPw.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPw = document.getElementById('admin-new-pw').value;
        const confirmPw = document.getElementById('admin-confirm-pw').value;
        const status = document.getElementById('admin-pw-status');
        
        if (newPw !== confirmPw) {
            status.textContent = "Passwords do not match!";
            status.className = "status-msg status-error";
            return;
        }
        
        const creds = await getCredentials();
        const hashedPassword = await hashPassword(newPw);
        creds.admin.password = hashedPassword;
        await saveCredentials(creds);
        
        status.textContent = "Admin password updated successfully!";
        status.className = "status-msg status-success";
        formAdminPw.reset();
        setTimeout(() => status.textContent = "", 3000);
    });

    // Change Super Admin password submit
    const formSaPw = document.getElementById('form-change-sa-pw');
    formSaPw.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPw = document.getElementById('sa-new-pw').value;
        const confirmPw = document.getElementById('sa-confirm-pw').value;
        const status = document.getElementById('sa-pw-status');
        
        if (newPw !== confirmPw) {
            status.textContent = "Passwords do not match!";
            status.className = "status-msg status-error";
            return;
        }
        
        const creds = await getCredentials();
        const hashedPassword = await hashPassword(newPw);
        creds.superadmin.password = hashedPassword;
        await saveCredentials(creds);
        
        status.textContent = "Super Admin password updated successfully!";
        status.className = "status-msg status-success";
        formSaPw.reset();
        setTimeout(() => status.textContent = "", 3000);
    });

    // Factory Reset Database
    const resetBtn = document.getElementById('btn-factory-reset');
    resetBtn.addEventListener('click', async () => {
        if (confirm("WARNING: This will delete ALL custom profiles, reset passwords to default, and reload the page. Continue?")) {
            localStorage.removeItem('birthday_profiles');
            localStorage.removeItem('birthday_active_profile_id');
            localStorage.removeItem('birthday_credentials');
            if (useFirebase && db) {
                try {
                    // Reset Firestore documents
                    await db.collection("settings").doc("active_profile").set({ activeId: 'default' });
                    await db.collection("settings").doc("credentials").set(DEFAULT_CREDENTIALS);
                    
                    const querySnapshot = await db.collection("profiles").get();
                    querySnapshot.forEach(async (docSnap) => {
                        if (docSnap.id !== 'default') {
                            await db.collection("profiles").doc(docSnap.id).delete();
                        }
                    });
                } catch (e) {
                    console.error("Firestore factory reset failed:", e);
                }
            }
            alert("System database reset successfully. Page will reload.");
            window.location.reload();
        }
    });

    // ----------------------------------------------------------------
    // 9. REFRESH & USER MANAGEMENT OPERATIONS (SUPER ADMIN ONLY)
    // ----------------------------------------------------------------

    // Refresh dashboard data
    const refreshBtn = document.getElementById('db-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            // Clear cache variables to force fresh fetch from database
            cachedProfiles = null;
            cachedActiveProfileId = null;
            cachedCredentials = null;
            
            await loadActiveProfileData();
            await populateDashboardForm();
            await renderProfilesTable();
            if (activeSessionRole === 'superadmin') {
                await renderSaUsersList();
            }
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 600);
        });
    }

    async function renderSaUsersList() {
        const tbody = document.getElementById('custom-users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const creds = await getCredentials();
        
        // 1. Root Superadmin
        if (creds.superadmin) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(creds.superadmin.username)}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(System)</span></td>
                <td><span class="badge sa-badge">superadmin</span></td>
                <td>
                    <button class="btn-action" title="System User (Cannot Delete)" disabled style="background: #334155; color: #64748b; cursor: not-allowed; opacity: 0.6;">
                        <i class="fa-solid fa-lock"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        
        // 2. Root Admin
        if (creds.admin) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(creds.admin.username)}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(System)</span></td>
                <td><span class="badge">admin</span></td>
                <td>
                    <button class="btn-action" title="System User (Cannot Delete)" disabled style="background: #334155; color: #64748b; cursor: not-allowed; opacity: 0.6;">
                        <i class="fa-solid fa-lock"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }

        // 3. Custom Users
        const usersList = creds.users || [];
        usersList.forEach((user, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td><span class="badge ${user.role === 'superadmin' ? 'sa-badge' : ''}">${escapeHtml(user.role)}</span></td>
                <td>
                    <button class="btn-action btn-delete-user" title="Delete User" data-index="${index}" style="background: var(--warning-color); color: white;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            
            const deleteUserBtn = tr.querySelector('.btn-delete-user');
            if (deleteUserBtn) {
                deleteUserBtn.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
                        creds.users.splice(index, 1);
                        await saveCredentials(creds);
                        await renderSaUsersList();
                    }
                });
            }
            
            tbody.appendChild(tr);
        });
    }

    // Add new user submit form
    const formAddUser = document.getElementById('form-add-portal-user');
    if (formAddUser) {
        formAddUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('add-user-username').value.trim();
            const password = document.getElementById('add-user-password').value.trim();
            const role = document.getElementById('add-user-role').value;
            const status = document.getElementById('add-user-status');
            
            if (!username || !password) return;
            
            const creds = await getCredentials();
            if (!creds.users) {
                creds.users = [];
            }
            
            // Check if user already exists
            const exists = (creds.admin && creds.admin.username === username) ||
                           (creds.superadmin && creds.superadmin.username === username) ||
                           creds.users.some(u => u.username === username);
                           
            if (exists) {
                status.textContent = "Username already exists!";
                status.className = "status-msg status-error";
                return;
            }
            
            const hashedPassword = await hashPassword(password);
            creds.users.push({ username, password: hashedPassword, role });
            await saveCredentials(creds);
            
            status.textContent = "User added successfully!";
            status.className = "status-msg status-success";
            formAddUser.reset();
            await renderSaUsersList();
            setTimeout(() => status.textContent = "", 3000);
        });
    }
});
