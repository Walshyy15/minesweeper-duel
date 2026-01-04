/**
 * Minesweeper Duel - Main Application JavaScript
 * Handles SPA routing, UI interactions, and mock data
 */

// ============================================
// APPLICATION STATE
// ============================================
const App = {
    currentView: 'home',
    user: null,
    isNavOpen: false,
};

// ============================================
// MOCK DATA
// ============================================
const MockData = {
    user: {
        username: 'ProSweeper',
        rank: 'Diamond III',
        rankIcon: '💎',
        avatar: 'PS',
        stats: {
            gamesPlayed: 247,
            wins: 158,
            losses: 89,
            winRate: 64,
            avgTime: '1:42',
            bestTime: '0:38',
            currentStreak: 5,
            longestStreak: 12,
        },
    },
    faq: [
        {
            question: 'What is player-hosted multiplayer?',
            answer: 'Instead of relying on central servers, players can host matches directly on their own computers. One player creates a game and shares a connection code with friends. This peer-to-peer approach keeps the game free and gives you more control over your matches.',
        },
        {
            question: 'Do I need a strong PC to host?',
            answer: 'Not at all! Minesweeper Duel is extremely lightweight. Any modern computer, laptop, or even older machines can easily host a game. The game uses minimal CPU and memory, so you can host while running other applications.',
        },
        {
            question: 'Will this cost me anything?',
            answer: 'Minesweeper Duel is completely free to play. Because players host their own games, there are no server costs to cover. No subscriptions, no premium currency, no pay-to-win mechanics.',
        },
        {
            question: 'Is it safe to host games?',
            answer: 'Yes! When you host a game, you only share a connection code with people you trust. The connection is direct between players and encrypted. You\'re never exposing your full IP address or any personal information to strangers.',
        },
        {
            question: 'How many players can join a game?',
            answer: 'Currently, Minesweeper Duel supports 1v1 matches for the classic competitive experience. We\'re exploring tournament modes and spectator features for future updates.',
        },
        {
            question: 'Can I play with friends in different countries?',
            answer: 'Absolutely! As long as you can share your game code with friends (via Discord, text, email, etc.), they can join from anywhere in the world. Connection quality depends on the distance, but most players experience smooth gameplay globally.',
        },
    ],
};

// ============================================
// ROUTER
// ============================================
const Router = {
    routes: {
        home: 'view-home',
        'how-it-works': 'view-how-it-works',
        play: 'view-play',
        profile: 'view-profile',
        faq: 'view-faq',
    },

    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        // Handle initial route
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash.slice(2) || 'home'; // Remove #/ prefix
        const viewId = this.routes[hash] || this.routes.home;

        this.showView(viewId);
        this.updateNavLinks(hash);
        App.currentView = hash;

        // Close mobile nav on route change
        UI.closeNav();

        // Scroll to top on route change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }
    },

    updateNavLinks(activeRoute) {
        document.querySelectorAll('.nav__link').forEach(link => {
            const href = link.getAttribute('href');
            const route = href.replace('#/', '');
            link.classList.toggle('nav__link--active', route === activeRoute);
        });
    },

    navigate(route) {
        window.location.hash = `/${route}`;
    },
};

// ============================================
// UI CONTROLLER
// ============================================
const UI = {
    init() {
        this.initNavToggle();
        this.initAccordion();
        this.initForms();
        this.initMiniGrid();
        this.loadUserData();
    },

    initNavToggle() {
        const toggle = document.getElementById('nav-toggle');
        const links = document.getElementById('nav-links');

        if (toggle && links) {
            toggle.addEventListener('click', () => {
                App.isNavOpen = !App.isNavOpen;
                links.classList.toggle('active', App.isNavOpen);
                toggle.setAttribute('aria-expanded', App.isNavOpen);
            });
        }
    },

    closeNav() {
        const links = document.getElementById('nav-links');
        const toggle = document.getElementById('nav-toggle');

        if (links && toggle) {
            App.isNavOpen = false;
            links.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }
    },

    initAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const wasActive = item.classList.contains('active');

                // Close all items
                document.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('active');
                });

                // Toggle clicked item
                if (!wasActive) {
                    item.classList.add('active');
                }
            });
        });
    },

    initForms() {
        // Create Game Form
        const createForm = document.getElementById('create-game-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateGame(new FormData(createForm));
            });
        }

        // Join Game Form
        const joinForm = document.getElementById('join-game-form');
        if (joinForm) {
            joinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleJoinGame(new FormData(joinForm));
            });
        }

        // Profile Name Form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateProfile(new FormData(profileForm));
            });
        }
    },

    handleCreateGame(formData) {
        const playerName = formData.get('playerName') || 'Player';
        const difficulty = formData.get('difficulty') || 'medium';

        // Validate
        if (playerName.trim().length < 2) {
            this.showToast('Please enter a valid name (at least 2 characters)', 'error');
            return;
        }

        // Generate mock game code
        const gameCode = this.generateGameCode();

        // Save to localStorage
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('lastGameCode', gameCode);

        // Show success with game code
        this.showToast(`Game created! Your code: ${gameCode}`, 'success');

        // Show the game code in a more visible way
        const codeDisplay = document.getElementById('game-code-display');
        if (codeDisplay) {
            codeDisplay.querySelector('.game-code').textContent = gameCode;
            codeDisplay.classList.remove('hidden');
        }
    },

    handleJoinGame(formData) {
        const gameCode = formData.get('gameCode');
        const playerName = formData.get('playerNameJoin') || localStorage.getItem('playerName') || 'Player';

        // Validate game code format
        if (!gameCode || gameCode.length !== 6) {
            this.showToast('Please enter a valid 6-character game code', 'error');
            return;
        }

        // Save player name
        localStorage.setItem('playerName', playerName);

        // Mock joining (in real app, this would connect to the host)
        this.showToast(`Connecting to game ${gameCode.toUpperCase()}...`, 'info');

        // Simulate connection
        setTimeout(() => {
            this.showToast('This is a demo. In the full game, you\'d connect to the host now!', 'success');
        }, 1500);
    },

    handleUpdateProfile(formData) {
        const username = formData.get('username');

        if (username && username.trim().length >= 2) {
            localStorage.setItem('playerName', username);
            MockData.user.username = username;
            this.loadUserData();
            this.showToast('Profile updated!', 'success');
        } else {
            this.showToast('Username must be at least 2 characters', 'error');
        }
    },

    generateGameCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    loadUserData() {
        // Load from localStorage or use mock data
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            MockData.user.username = savedName;
            MockData.user.avatar = savedName.substring(0, 2).toUpperCase();
        }

        // Update profile UI
        const profileName = document.getElementById('profile-username');
        const profileAvatar = document.getElementById('profile-avatar');
        const profileInput = document.getElementById('username-input');

        if (profileName) profileName.textContent = MockData.user.username;
        if (profileAvatar) profileAvatar.textContent = MockData.user.avatar;
        if (profileInput) profileInput.value = MockData.user.username;

        // Update stats
        this.renderStats();
    },

    renderStats() {
        const stats = MockData.user.stats;

        // Update stat values
        const statElements = {
            'stat-games': stats.gamesPlayed,
            'stat-wins': stats.wins,
            'stat-winrate': `${stats.winRate}%`,
            'stat-avgtime': stats.avgTime,
            'stat-besttime': stats.bestTime,
            'stat-streak': stats.currentStreak,
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    },

    initMiniGrid() {
        const grid = document.getElementById('mini-grid');
        if (!grid) return;

        // Generate a sample minesweeper grid
        const gridData = this.generateMiniGridData();
        grid.innerHTML = gridData.map((cell, i) => {
            let className = 'mini-cell';
            let content = '';

            if (cell === 'hidden') {
                className += '';
            } else if (cell === 'flag') {
                className += ' mini-cell--revealed mini-cell--flag';
                content = '🚩';
            } else if (cell === 'mine') {
                className += ' mini-cell--revealed mini-cell--mine';
                content = '💣';
            } else if (cell === 0) {
                className += ' mini-cell--revealed';
            } else {
                className += ` mini-cell--revealed mini-cell--${cell}`;
                content = cell;
            }

            return `<div class="${className}">${content}</div>`;
        }).join('');

        // Animate cells appearing
        const cells = grid.querySelectorAll('.mini-cell');
        cells.forEach((cell, i) => {
            cell.style.opacity = '0';
            cell.style.transform = 'scale(0.8)';
            setTimeout(() => {
                cell.style.transition = 'all 0.3s ease';
                cell.style.opacity = '1';
                cell.style.transform = 'scale(1)';
            }, i * 20);
        });
    },

    generateMiniGridData() {
        // Create a mix of revealed numbers, flags, and hidden cells
        const data = [];
        const totalCells = 48; // 8x6 or 6x8 grid

        for (let i = 0; i < totalCells; i++) {
            const rand = Math.random();
            if (rand < 0.35) {
                data.push('hidden');
            } else if (rand < 0.45) {
                data.push('flag');
            } else if (rand < 0.5) {
                data.push(0);
            } else if (rand < 0.7) {
                data.push(1);
            } else if (rand < 0.85) {
                data.push(2);
            } else if (rand < 0.95) {
                data.push(3);
            } else {
                data.push(4);
            }
        }

        return data;
    },

    showToast(message, type = 'info') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        // Create toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;

        // Style based on type
        if (type === 'success') {
            toast.style.borderColor = 'var(--color-success)';
        } else if (type === 'error') {
            toast.style.borderColor = 'var(--color-danger)';
        }

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    getToastIcon(type) {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'info': return 'ℹ';
            default: return 'ℹ';
        }
    },
};

// ============================================
// FAQ RENDERER
// ============================================
const FAQ = {
    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('faq-accordion');
        if (!container) return;

        container.innerHTML = MockData.faq.map((item, index) => `
      <div class="accordion-item${index === 0 ? ' active' : ''}">
        <button class="accordion-header" aria-expanded="${index === 0}">
          <span>${item.question}</span>
          <span class="accordion-icon">▼</span>
        </button>
        <div class="accordion-content">
          <div class="accordion-body">${item.answer}</div>
        </div>
      </div>
    `).join('');

        // Re-init accordion after render
        UI.initAccordion();
    },
};

// ============================================
// COPY TO CLIPBOARD
// ============================================
function copyGameCode() {
    const codeEl = document.querySelector('.game-code');
    if (!codeEl) return;

    const code = codeEl.textContent;
    navigator.clipboard.writeText(code).then(() => {
        UI.showToast('Game code copied to clipboard!', 'success');
    }).catch(() => {
        UI.showToast('Failed to copy code', 'error');
    });
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    Router.init();
    UI.init();
    FAQ.init();

    // Set initial view if no hash
    if (!window.location.hash) {
        window.location.hash = '/home';
    }
});

// ============================================
// KEYBOARD NAVIGATION
// ============================================
document.addEventListener('keydown', (e) => {
    // Close mobile nav on Escape
    if (e.key === 'Escape' && App.isNavOpen) {
        UI.closeNav();
    }
});

// ============================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ============================================
const observeElements = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .play-card, .section-header').forEach(el => {
        observer.observe(el);
    });
};

// Run after initial load
window.addEventListener('load', observeElements);
