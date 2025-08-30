// Game Configuration
const GAME_CONFIG = {
    MAX_PLAYERS: 4,
    CARDS_PER_PLAYER: 4,
    FRUITS: ['apple', 'banana', 'orange', 'mango'],
    FRUIT_NAMES: {
        apple: '🍎 Apple',
        banana: '🍌 Banana', 
        orange: '🍊 Orange',
        mango: '🥭 Mango'
    }
};

// Game State
let gameState = {
    isHost: false,
    roomCode: null,
    playerId: null,
    players: [],
    currentPlayer: 0,
    gameStarted: false,
    gameOver: false,
    winner: null,
    selectedCard: null,
    selectedTarget: null,
    lastUpdate: 0
};

// DOM Elements
const screens = {
    mainMenu: document.getElementById('mainMenu'),
    createGame: document.getElementById('createGameScreen'),
    joinGame: document.getElementById('joinGameScreen'),
    gameScreen: document.getElementById('gameScreen'),
    gameOver: document.getElementById('gameOverScreen')
};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    showScreen('mainMenu');
    startGameSync();
});

// Event Listeners
function initializeEventListeners() {
    // Main Menu
    document.getElementById('createGameBtn').addEventListener('click', createGame);
    document.getElementById('joinGameBtn').addEventListener('click', () => showScreen('joinGame'));

    // Create Game
    document.getElementById('copyCodeBtn').addEventListener('click', copyRoomCode);
    document.getElementById('refreshBtn').addEventListener('click', refreshPlayerList);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('backToMenuBtn').addEventListener('click', () => showScreen('mainMenu'));

    // Join Game
    document.getElementById('joinWithCodeBtn').addEventListener('click', joinGame);
    document.getElementById('backToMenuBtn2').addEventListener('click', () => showScreen('mainMenu'));
    document.getElementById('joinCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Game Screen
    document.getElementById('leaveGameBtn').addEventListener('click', leaveGame);
    document.getElementById('passToNextBtn').addEventListener('click', passToNextPerson);

    // Game Over
    document.getElementById('playAgainBtn').addEventListener('click', playAgain);
    document.getElementById('backToMenuBtn3').addEventListener('click', () => showScreen('mainMenu'));
}

// Screen Management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

function showLoading(message = 'Connecting...') {
    document.getElementById('loadingText').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Game Creation and Joining
async function createGame() {
    showLoading('Creating game room...');
    
    try {
        // Generate room code
        gameState.roomCode = generateRoomCode();
        gameState.isHost = true;
        gameState.playerId = generatePlayerId();
        
        // Create initial game state
        gameState.players = [{
            id: gameState.playerId,
            name: 'You (Host)',
            cards: [],
            isHost: true
        }];
        
        // Save to localStorage
        gameState.lastUpdate = Date.now();
        saveGameState();
        
        hideLoading();
        document.getElementById('roomCode').textContent = gameState.roomCode;
        showScreen('createGame');
        updatePlayerList();
        updateStartButton();
        
        console.log('Game created with room code:', gameState.roomCode);
        
    } catch (error) {
        hideLoading();
        alert('Failed to create game: ' + error.message);
    }
}

async function joinGame() {
    const roomCode = document.getElementById('joinCodeInput').value.trim();
    
    if (roomCode.length !== 4) {
        alert('Please enter a valid 4-digit room code');
        return;
    }
    
    showLoading('Joining game...');
    
    try {
        gameState.roomCode = roomCode;
        gameState.isHost = false;
        gameState.playerId = generatePlayerId();
        
        // Try to load existing game
        const existingGame = loadGameState(roomCode);
        
        if (existingGame && existingGame.players.length >= GAME_CONFIG.MAX_PLAYERS) {
            alert('Game is full. Please try joining another game.');
            hideLoading();
            return;
        }
        
        // Add player to game
        if (existingGame) {
            gameState = existingGame;
        }
        
        const newPlayer = {
            id: gameState.playerId,
            name: 'Player ' + (gameState.players.length + 1),
            cards: [],
            isHost: false
        };
        
        gameState.players.push(newPlayer);
        gameState.lastUpdate = Date.now();
        saveGameState();
        
        hideLoading();
        showScreen('gameScreen');
        updateGameDisplay();
        
        if (gameState.gameStarted) {
            initializeGame();
        }
        
    } catch (error) {
        hideLoading();
        alert('Failed to join game: ' + error.message);
    }
}

// Game Logic
function startGame() {
    if (gameState.players.length !== GAME_CONFIG.MAX_PLAYERS) {
        alert('Need exactly 4 players to start the game');
        return;
    }
    
    // Deal cards
    dealCards();
    
    // Start the game
    gameState.gameStarted = true;
    gameState.currentPlayer = 0;
    gameState.lastUpdate = Date.now();
    
    saveGameState();
    showScreen('gameScreen');
    initializeGame();
}

function dealCards() {
    // Create deck with 4 of each fruit
    let deck = [];
    GAME_CONFIG.FRUITS.forEach(fruit => {
        for (let i = 0; i < 4; i++) {
            deck.push(fruit);
        }
    });
    
    // Shuffle deck
    deck = shuffleArray(deck);
    
    // Deal 4 cards to each player
    gameState.players.forEach((player, index) => {
        player.cards = deck.slice(index * 4, (index + 1) * 4);
    });
}

function initializeGame() {
    updateGameDisplay();
    updateGameStatus();
    
    if (isCurrentPlayer()) {
        enablePlayerTurn();
    } else {
        disablePlayerTurn();
    }
}

function updateGameDisplay() {
    // Update player slots with card counts
    gameState.players.forEach((player, index) => {
        if (index === 0) return; // Skip current player
        
        const playerSlot = document.getElementById(`player${index}`);
        if (playerSlot) {
            playerSlot.querySelector('.player-name').textContent = player.name;
            playerSlot.querySelector('.card-count').textContent = `${player.cards.length} cards`;
            
            // Show card preview for other players (just count, not actual cards)
            const cardPreview = playerSlot.querySelector('.card-preview');
            if (cardPreview) {
                cardPreview.textContent = `Cards: ${player.cards.length}`;
            }
        }
    });
    
    // Update current player's cards
    const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (currentPlayer) {
        displayPlayerCards(currentPlayer.cards);
    }
    
    // Update room code
    document.getElementById('gameRoomCode').textContent = gameState.roomCode;
    
    // Log for debugging
    console.log('Updated game display - Current player cards:', currentPlayer ? currentPlayer.cards : 'No current player');
}

function displayPlayerCards(cards) {
    const cardsContainer = document.getElementById('playerCards');
    cardsContainer.innerHTML = '';
    
    console.log('Displaying cards for current player:', cards);
    
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card}`;
        cardElement.textContent = GAME_CONFIG.FRUIT_NAMES[card].split(' ')[1];
        cardElement.dataset.index = index;
        
        cardElement.addEventListener('click', () => selectCard(index));
        cardsContainer.appendChild(cardElement);
    });
    
    // Update the card count display
    const cardCountDisplay = document.querySelector('.player-cards .card-count-display');
    if (cardCountDisplay) {
        cardCountDisplay.textContent = `You have ${cards.length} cards`;
    }
}

function selectCard(index) {
    if (!isCurrentPlayer()) return;
    
    // Clear previous selection
    document.querySelectorAll('.card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select new card
    const cardElement = document.querySelector(`[data-index="${index}"]`);
    cardElement.classList.add('selected');
    
    gameState.selectedCard = index;
    showTargetPlayers();
}

function showTargetPlayers() {
    const passArea = document.getElementById('passArea');
    const targetPlayers = document.getElementById('targetPlayers');
    
    passArea.style.display = 'block';
    targetPlayers.innerHTML = '';
    
    // Show "Pass to Next Person" button
    document.getElementById('passToNextBtn').style.display = 'block';
    
    // Also show individual player buttons
    gameState.players.forEach((player, index) => {
        if (player.id !== gameState.playerId) {
            const button = document.createElement('button');
            button.className = 'target-player-btn';
            button.textContent = player.name;
            button.addEventListener('click', () => passCard(index));
            targetPlayers.appendChild(button);
        }
    });
}

function passCard(targetIndex) {
    if (gameState.selectedCard === null) return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
    const targetPlayer = gameState.players[targetIndex];
    
    // Get the card to pass
    const cardToPass = currentPlayer.cards[gameState.selectedCard];
    
    console.log(`Passing ${cardToPass} from ${currentPlayer.name} to ${targetPlayer.name}`);
    
    // Remove card from current player
    currentPlayer.cards.splice(gameState.selectedCard, 1);
    
    // Add card to target player
    targetPlayer.cards.push(cardToPass);
    
    console.log(`After passing - ${currentPlayer.name} has ${currentPlayer.cards.length} cards, ${targetPlayer.name} has ${targetPlayer.cards.length} cards`);
    
    // Check for winner
    if (checkWinner(targetPlayer)) {
        endGame(targetPlayer);
        return;
    }
    
    // Move to next player
    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    
    // Reset selection
    gameState.selectedCard = null;
    document.getElementById('passArea').style.display = 'none';
    
    // Update game state
    gameState.lastUpdate = Date.now();
    saveGameState();
    
    // Force immediate display update
    updateGameDisplay();
    updateGameStatus();
    
    if (isCurrentPlayer()) {
        enablePlayerTurn();
    } else {
        disablePlayerTurn();
    }
}

function checkWinner(player) {
    if (player.cards.length !== 4) return false;
    
    const firstCard = player.cards[0];
    return player.cards.every(card => card === firstCard);
}

function endGame(winner) {
    gameState.gameOver = true;
    gameState.winner = winner;
    gameState.lastUpdate = Date.now();
    
    saveGameState();
    handleGameOver({ winner: winner, players: gameState.players });
}

function handleGameOver(data) {
    gameState.gameOver = true;
    gameState.winner = data.winner;
    gameState.players = data.players;
    
    const winnerInfo = document.getElementById('winnerInfo');
    const finalScores = document.getElementById('finalScores');
    
    if (data.winner.id === gameState.playerId) {
        winnerInfo.textContent = '🎉 Congratulations! You won! 🎉';
    } else {
        winnerInfo.textContent = `🏆 ${data.winner.name} won the game! 🏆`;
    }
    
    // Show final scores
    let scoresHtml = '<h3>Final Results:</h3>';
    data.players.forEach(player => {
        const cardCount = player.cards.length;
        const fruitType = cardCount > 0 ? player.cards[0] : 'none';
        scoresHtml += `<div>${player.name}: ${cardCount} cards (${cardCount > 0 ? GAME_CONFIG.FRUIT_NAMES[fruitType] : 'No cards'})</div>`;
    });
    finalScores.innerHTML = scoresHtml;
    
    showScreen('gameOver');
}

// Utility Functions
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function isCurrentPlayer() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    return currentPlayer && currentPlayer.id === gameState.playerId;
}

function enablePlayerTurn() {
    document.getElementById('gameMessage').textContent = 'Your turn! Select a card to pass.';
    document.querySelectorAll('.card').forEach(card => {
        card.style.cursor = 'pointer';
    });
    
    // Show current player's cards clearly
    const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (currentPlayer) {
        console.log(`Your turn! You have ${currentPlayer.cards.length} cards:`, currentPlayer.cards);
    }
}

function disablePlayerTurn() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    document.getElementById('gameMessage').textContent = `Waiting for ${currentPlayer.name} to play...`;
    document.querySelectorAll('.card').forEach(card => {
        card.style.cursor = 'not-allowed';
    });
    document.getElementById('passArea').style.display = 'none';
    document.getElementById('passToNextBtn').style.display = 'none';
}

function updateGameStatus() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    document.getElementById('gameStatus').textContent = `Current Player: ${currentPlayer.name}`;
}

function updatePlayerList() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-status ready">Ready</span>
        `;
        playerList.appendChild(playerItem);
    });
    
    console.log(`Updated player list: ${gameState.players.length} players`);
}

function updateStartButton() {
    const startBtn = document.getElementById('startGameBtn');
    console.log(`Updating start button. Players: ${gameState.players.length}/${GAME_CONFIG.MAX_PLAYERS}`);
    
    if (gameState.players.length === GAME_CONFIG.MAX_PLAYERS) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
        console.log('Start button enabled');
    } else {
        startBtn.disabled = true;
        startBtn.textContent = `Start Game (Need ${GAME_CONFIG.MAX_PLAYERS - gameState.players.length} more players)`;
        console.log('Start button disabled');
    }
}

function copyRoomCode() {
    navigator.clipboard.writeText(gameState.roomCode).then(() => {
        const btn = document.getElementById('copyCodeBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Local Storage Functions
function saveGameState() {
    if (gameState.roomCode) {
        localStorage.setItem(`game_${gameState.roomCode}`, JSON.stringify(gameState));
    }
}

function loadGameState(roomCode) {
    const saved = localStorage.getItem(`game_${roomCode}`);
    return saved ? JSON.parse(saved) : null;
}

function clearGameState() {
    if (gameState.roomCode) {
        localStorage.removeItem(`game_${gameState.roomCode}`);
    }
}

// Game Synchronization
function startGameSync() {
    setInterval(() => {
        if (gameState.roomCode && !gameState.gameOver) {
            const savedGame = loadGameState(gameState.roomCode);
            if (savedGame && savedGame.lastUpdate > gameState.lastUpdate) {
                // Game state has been updated by another player
                const oldPlayerCount = gameState.players.length;
                const oldCurrentPlayer = gameState.currentPlayer;
                
                gameState = savedGame;
                
                console.log(`Game state updated - Current player: ${gameState.currentPlayer}, Players: ${gameState.players.length}`);
                
                if (gameState.gameStarted) {
                    updateGameDisplay();
                    updateGameStatus();
                    
                    if (isCurrentPlayer()) {
                        enablePlayerTurn();
                    } else {
                        disablePlayerTurn();
                    }
                    
                    // Log card changes for debugging
                    gameState.players.forEach((player, index) => {
                        console.log(`Player ${index} (${player.name}): ${player.cards.length} cards`);
                    });
                } else {
                    updatePlayerList();
                    updateStartButton();
                    
                    // If player count changed, update the display
                    if (oldPlayerCount !== gameState.players.length) {
                        console.log(`Player count changed from ${oldPlayerCount} to ${gameState.players.length}`);
                    }
                }
            }
        }
    }, 300); // Check every 300ms for even faster updates
}

function leaveGame() {
    // Remove player from game
    if (gameState.roomCode && gameState.playerId) {
        const savedGame = loadGameState(gameState.roomCode);
        if (savedGame) {
            const playerIndex = savedGame.players.findIndex(p => p.id === gameState.playerId);
            if (playerIndex !== -1) {
                savedGame.players.splice(playerIndex, 1);
                savedGame.lastUpdate = Date.now();
                localStorage.setItem(`game_${gameState.roomCode}`, JSON.stringify(savedGame));
            }
        }
    }
    
    // Reset game state
    gameState = {
        isHost: false,
        roomCode: null,
        playerId: null,
        players: [],
        currentPlayer: 0,
        gameStarted: false,
        gameOver: false,
        winner: null,
        selectedCard: null,
        selectedTarget: null,
        lastUpdate: 0
    };
    
    showScreen('mainMenu');
}

function playAgain() {
    if (gameState.isHost) {
        // Host can start a new game
        showScreen('createGame');
    } else {
        // Other players need to join a new game
        showScreen('mainMenu');
    }
}

// Refresh player list manually
function refreshPlayerList() {
    if (gameState.roomCode) {
        const savedGame = loadGameState(gameState.roomCode);
        if (savedGame) {
            gameState = savedGame;
            updatePlayerList();
            updateStartButton();
            console.log('Player list refreshed manually');
        }
    }
}

// Pass card to next person in turn order
function passToNextPerson() {
    if (gameState.selectedCard === null) {
        alert('Please select a card first!');
        return;
    }
    
    // Find the next player in turn order
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    // Pass the card to the next player
    passCard(nextPlayerIndex);
}
