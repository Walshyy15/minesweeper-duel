/**
 * Minesweeper Duel - Main Application JavaScript
 * Handles SPA routing, UI interactions, and full Minesweeper game logic
 */

// ============================================
// APPLICATION STATE
// ============================================
const App = {
    currentView: 'home',
    user: null,
    isNavOpen: false,
    gameSettings: {
        difficulty: 'intermediate',
        playerName: 'Player',
    },
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
// DIFFICULTY SETTINGS
// ============================================
const DifficultySettings = {
    beginner: { rows: 9, cols: 9, mines: 10, name: 'Beginner' },
    intermediate: { rows: 16, cols: 16, mines: 40, name: 'Intermediate' },
    expert: { rows: 16, cols: 30, mines: 99, name: 'Expert' },
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
        game: 'view-game',
    },

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash.slice(2) || 'home';
        const viewId = this.routes[hash] || this.routes.home;

        this.showView(viewId);
        this.updateNavLinks(hash);
        App.currentView = hash;

        UI.closeNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

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
// MINESWEEPER GAME ENGINE
// ============================================
const Game = {
    board: [],
    rows: 16,
    cols: 16,
    mines: 40,
    minesRemaining: 40,
    cellsRemaining: 0,
    gameOver: false,
    gameWon: false,
    firstClick: true,
    timer: null,
    seconds: 0,
    clicks: 0,

    // Initialize a new game
    init(difficulty = 'intermediate') {
        const settings = DifficultySettings[difficulty] || DifficultySettings.intermediate;
        this.rows = settings.rows;
        this.cols = settings.cols;
        this.mines = settings.mines;
        this.minesRemaining = settings.mines;
        this.cellsRemaining = (this.rows * this.cols) - this.mines;
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.seconds = 0;
        this.clicks = 0;
        this.board = [];

        // Clear any existing timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Create empty board
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c] = {
                    mine: false,
                    revealed: false,
                    flagged: false,
                    adjacentMines: 0,
                };
            }
        }

        // Update UI
        this.updateDifficultyBadge(settings.name);
        this.updateStats();
        this.render();
        this.hideModal();
    },

    // Place mines after first click (to ensure first click is safe)
    placeMines(safeRow, safeCol) {
        let placed = 0;
        while (placed < this.mines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            // Don't place mine on first click or adjacent cells
            const isSafeZone = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1;

            if (!this.board[r][c].mine && !isSafeZone) {
                this.board[r][c].mine = true;
                placed++;
            }
        }

        // Calculate adjacent mine counts
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.board[r][c].mine) {
                    this.board[r][c].adjacentMines = this.countAdjacentMines(r, c);
                }
            }
        }
    },

    // Count mines in adjacent cells
    countAdjacentMines(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    if (this.board[r][c].mine) count++;
                }
            }
        }
        return count;
    },

    // Handle cell click (reveal)
    revealCell(row, col) {
        if (this.gameOver) return;

        const cell = this.board[row][col];
        if (cell.revealed || cell.flagged) return;

        // First click - place mines and start timer
        if (this.firstClick) {
            this.placeMines(row, col);
            this.startTimer();
            this.firstClick = false;
        }

        this.clicks++;
        cell.revealed = true;

        if (cell.mine) {
            // Game over - hit a mine
            this.endGame(false, row, col);
            return;
        }

        this.cellsRemaining--;

        // If no adjacent mines, reveal neighbors recursively
        if (cell.adjacentMines === 0) {
            this.revealAdjacentCells(row, col);
        }

        // Check for win
        if (this.cellsRemaining === 0) {
            this.endGame(true);
            return;
        }

        this.updateStats();
        this.renderCell(row, col);
    },

    // Reveal adjacent cells (flood fill for empty cells)
    revealAdjacentCells(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    const adjCell = this.board[r][c];
                    if (!adjCell.revealed && !adjCell.mine && !adjCell.flagged) {
                        adjCell.revealed = true;
                        this.cellsRemaining--;
                        this.renderCell(r, c);

                        if (adjCell.adjacentMines === 0) {
                            this.revealAdjacentCells(r, c);
                        }
                    }
                }
            }
        }
    },

    // Toggle flag on cell
    toggleFlag(row, col) {
        if (this.gameOver) return;

        const cell = this.board[row][col];
        if (cell.revealed) return;

        cell.flagged = !cell.flagged;
        this.minesRemaining += cell.flagged ? -1 : 1;

        this.updateStats();
        this.renderCell(row, col);
    },

    // End the game
    endGame(won, explodedRow = -1, explodedCol = -1) {
        this.gameOver = true;
        this.gameWon = won;

        // Stop timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Reveal all mines
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].mine) {
                    this.board[r][c].revealed = true;
                }
            }
        }

        // Update game status
        const statusEl = document.getElementById('game-status');
        if (statusEl) {
            statusEl.querySelector('.game-status__icon').textContent = won ? '🎉' : '💥';
            statusEl.querySelector('.game-status__text').textContent = won ? 'Victory!' : 'Game Over';
        }

        // Re-render board to show mines
        this.render();

        // Mark exploded mine
        if (!won && explodedRow >= 0) {
            const cellId = `cell-${explodedRow}-${explodedCol}`;
            const cellEl = document.getElementById(cellId);
            if (cellEl) {
                cellEl.classList.add('cell--mine-exploded');
            }
        }

        // Show modal after a short delay
        setTimeout(() => {
            this.showModal(won);
        }, 500);

        // Update stats
        if (won) {
            this.updatePlayerStats(true);
        } else {
            this.updatePlayerStats(false);
        }
    },

    // Update player statistics in localStorage
    updatePlayerStats(won) {
        let stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        if (won) {
            stats.wins = (stats.wins || 0) + 1;
            const bestTime = stats.bestTime || 9999;
            if (this.seconds < bestTime) {
                stats.bestTime = this.seconds;
            }
        }
        stats.winRate = Math.round((stats.wins || 0) / stats.gamesPlayed * 100);
        localStorage.setItem('gameStats', JSON.stringify(stats));
    },

    // Timer functions
    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            this.updateTimerDisplay();
        }, 1000);
    },

    updateTimerDisplay() {
        const minutes = Math.floor(this.seconds / 60);
        const secs = this.seconds % 60;
        const display = `${minutes}:${secs.toString().padStart(2, '0')}`;
        const timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.textContent = display;
    },

    // Update stats display
    updateStats() {
        const minesEl = document.getElementById('mines-remaining');
        const cellsEl = document.getElementById('cells-remaining');

        if (minesEl) minesEl.textContent = this.minesRemaining;
        if (cellsEl) cellsEl.textContent = this.cellsRemaining;
    },

    updateDifficultyBadge(name) {
        const badgeEl = document.getElementById('game-difficulty-badge');
        if (badgeEl) badgeEl.textContent = name;
    },

    // Render the game board
    render() {
        const boardEl = document.getElementById('game-board');
        if (!boardEl) return;

        boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        boardEl.innerHTML = '';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                const cellEl = document.createElement('div');
                cellEl.id = `cell-${r}-${c}`;
                cellEl.className = 'cell';

                if (cell.revealed) {
                    cellEl.classList.add('cell--revealed');
                    if (cell.mine) {
                        cellEl.classList.add('cell--mine');
                        cellEl.textContent = '💣';
                    } else if (cell.adjacentMines > 0) {
                        cellEl.classList.add(`cell--${cell.adjacentMines}`);
                        cellEl.textContent = cell.adjacentMines;
                    }
                } else if (cell.flagged) {
                    cellEl.classList.add('cell--flagged');
                    cellEl.textContent = '🚩';
                }

                // Event listeners
                cellEl.addEventListener('click', () => this.revealCell(r, c));
                cellEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleFlag(r, c);
                });

                boardEl.appendChild(cellEl);
            }
        }

        // Reset game status
        const statusEl = document.getElementById('game-status');
        if (statusEl && !this.gameOver) {
            statusEl.querySelector('.game-status__icon').textContent = '🎮';
            statusEl.querySelector('.game-status__text').textContent = 'Playing...';
        }
    },

    // Render a single cell (for performance)
    renderCell(row, col) {
        const cellEl = document.getElementById(`cell-${row}-${col}`);
        if (!cellEl) return;

        const cell = this.board[row][col];
        cellEl.className = 'cell';

        if (cell.revealed) {
            cellEl.classList.add('cell--revealed');
            if (cell.mine) {
                cellEl.classList.add('cell--mine');
                cellEl.textContent = '💣';
            } else if (cell.adjacentMines > 0) {
                cellEl.classList.add(`cell--${cell.adjacentMines}`);
                cellEl.textContent = cell.adjacentMines;
            } else {
                cellEl.textContent = '';
            }
        } else if (cell.flagged) {
            cellEl.classList.add('cell--flagged');
            cellEl.textContent = '🚩';
        } else {
            cellEl.textContent = '';
        }
    },

    // Show game over modal
    showModal(won) {
        const modal = document.getElementById('game-modal');
        const iconEl = document.getElementById('game-modal-icon');
        const titleEl = document.getElementById('game-modal-title');
        const textEl = document.getElementById('game-modal-text');
        const timeEl = document.getElementById('modal-time');
        const clicksEl = document.getElementById('modal-clicks');

        if (!modal) return;

        const minutes = Math.floor(this.seconds / 60);
        const secs = this.seconds % 60;
        const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

        if (won) {
            iconEl.textContent = '🎉';
            titleEl.textContent = 'Victory!';
            titleEl.style.color = 'var(--color-success)';
            textEl.textContent = `Amazing! You cleared the board in ${timeStr}!`;
        } else {
            iconEl.textContent = '💥';
            titleEl.textContent = 'Game Over';
            titleEl.style.color = 'var(--color-danger)';
            textEl.textContent = 'You hit a mine! Better luck next time.';
        }

        timeEl.textContent = timeStr;
        clicksEl.textContent = this.clicks;

        modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = document.getElementById('game-modal');
        if (modal) modal.classList.add('hidden');
    },

    // Restart game with same settings
    restart() {
        this.hideModal();
        this.init(App.gameSettings.difficulty);
    },

    // Exit game and go back to lobby
    exitGame() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.hideModal();
        Router.navigate('play');
    },

    // Start a new game from the lobby
    startGame(difficulty, playerName) {
        App.gameSettings.difficulty = difficulty;
        App.gameSettings.playerName = playerName;
        Router.navigate('game');

        // Initialize game after navigation
        setTimeout(() => {
            this.init(difficulty);
        }, 100);
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

                document.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('active');
                });

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
        const difficulty = formData.get('difficulty') || 'intermediate';

        if (playerName.trim().length < 2) {
            this.showToast('Please enter a valid name (at least 2 characters)', 'error');
            return;
        }

        // Save player name
        localStorage.setItem('playerName', playerName);

        // Show toast and start game
        this.showToast('Starting game...', 'success');

        // Start the actual game
        setTimeout(() => {
            Game.startGame(difficulty, playerName);
        }, 500);
    },

    handleJoinGame(formData) {
        const gameCode = formData.get('gameCode');
        const playerName = formData.get('playerNameJoin') || localStorage.getItem('playerName') || 'Player';

        if (!gameCode || gameCode.length !== 6) {
            this.showToast('Please enter a valid 6-character game code', 'error');
            return;
        }

        // Save player name
        localStorage.setItem('playerName', playerName);

        // Show connecting message
        this.showToast(`Joining game ${gameCode.toUpperCase()}...`, 'info');

        // Start the game (in a real app, this would connect to host via WebRTC)
        setTimeout(() => {
            this.showToast('Game joined successfully!', 'success');
            Game.startGame('intermediate', playerName);
        }, 1000);
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
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    loadUserData() {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            MockData.user.username = savedName;
            MockData.user.avatar = savedName.substring(0, 2).toUpperCase();
        }

        // Load actual game stats from localStorage
        const savedStats = JSON.parse(localStorage.getItem('gameStats') || '{}');
        if (savedStats.gamesPlayed) {
            MockData.user.stats.gamesPlayed = savedStats.gamesPlayed;
            MockData.user.stats.wins = savedStats.wins || 0;
            MockData.user.stats.winRate = savedStats.winRate || 0;
            if (savedStats.bestTime) {
                const mins = Math.floor(savedStats.bestTime / 60);
                const secs = savedStats.bestTime % 60;
                MockData.user.stats.bestTime = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }

        // Update profile UI
        const profileName = document.getElementById('profile-username');
        const profileAvatar = document.getElementById('profile-avatar');
        const profileInput = document.getElementById('username-input');

        if (profileName) profileName.textContent = MockData.user.username;
        if (profileAvatar) profileAvatar.textContent = MockData.user.avatar;
        if (profileInput) profileInput.value = MockData.user.username;

        // Pre-fill play form inputs
        const playerNameInput = document.getElementById('player-name');
        const playerNameJoinInput = document.getElementById('player-name-join');
        if (playerNameInput && savedName) playerNameInput.value = savedName;
        if (playerNameJoinInput && savedName) playerNameJoinInput.value = savedName;

        this.renderStats();
    },

    renderStats() {
        const stats = MockData.user.stats;

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
        const data = [];
        const totalCells = 48;

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
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;

        if (type === 'success') {
            toast.style.borderColor = 'var(--color-success)';
        } else if (type === 'error') {
            toast.style.borderColor = 'var(--color-danger)';
        }

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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

    if (!window.location.hash) {
        window.location.hash = '/home';
    }
});

// ============================================
// KEYBOARD NAVIGATION
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (App.isNavOpen) {
            UI.closeNav();
        }
        // Close game modal on escape
        if (App.currentView === 'game') {
            Game.hideModal();
        }
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

window.addEventListener('load', observeElements);
