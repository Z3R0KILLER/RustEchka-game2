class RustEchkaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = null;
        
        this.myPlayer = { 
            id: null, 
            x: 400, 
            y: 300, 
            color: '#ff6b35', 
            wood: 0, 
            stone: 0,
            name: 'Вы'
        };
        this.otherPlayers = {};
        this.resources = { trees: [], stones: [] };
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.connectToServer();
        this.setupControls();
        this.gameLoop();
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    connectToServer() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ Подключились к RustEchka!');
        });
        
        this.socket.on('gameInit', (data) => {
            this.myPlayer.id = data.playerId;
            this.myPlayer.color = data.gameState.players[this.myPlayer.id].color;
            this.myPlayer.name = data.gameState.players[this.myPlayer.id].name;
            this.otherPlayers = data.gameState.players;
            this.resources = data.gameState.resources;
            this.updateUI();
        });
        
        this.socket.on('playerJoined', (player) => {
            this.otherPlayers[player.id] = player;
            this.updateUI();
        });
        
        this.socket.on('playerMoved', (data) => {
            if (this.otherPlayers[data.playerId]) {
                this.otherPlayers[data.playerId].x = data.x;
                this.otherPlayers[data.playerId].y = data.y;
            }
        });
        
        this.socket.on('playerResources', (data) => {
            if (data.playerId === this.myPlayer.id) {
                this.myPlayer.wood = data.wood;
                this.myPlayer.stone = data.stone;
                this.updateResourceDisplay();
            }
        });
        
        this.socket.on('resourceUpdated', (data) => {
            if (data.type === 'tree') {
                const tree = this.resources.trees.find(t => t.id === data.resourceId);
                if (tree) tree.wood = data.amount;
            } else if (data.type === 'stone') {
                const stone = this.resources.stones.find(s => s.id === data.resourceId);
                if (stone) stone.stone = data.amount;
            }
        });
        
        this.socket.on('playerLeft', (playerId) => {
            delete this.otherPlayers[playerId];
            this.updateUI();
        });
    }

    setupControls() {
        // Клик по canvas
        this.canvas.addEventListener('click', (e) => {
            this.handleInteraction(e.clientX, e.clientY);
        });
        
        // Тач для мобильных
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInteraction(touch.clientX, touch.clientY);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInteraction(touch.clientX, touch.clientY);
        });
    }

    handleInteraction(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Проверяем клик по ресурсам
        let resourceClicked = false;
        
        // Деревья
        for (const tree of this.resources.trees) {
            const distance = Math.sqrt((tree.x - x) ** 2 + (tree.y - y) ** 2);
            if (distance < 30 && tree.wood > 0) {
                this.socket.emit('collectResource', { 
                    resourceId: tree.id, 
                    type: 'tree' 
                });
                resourceClicked = true;
                break;
            }
        }
        
        // Камни
        if (!resourceClicked) {
            for (const stone of this.resources.stones) {
                const distance = Math.sqrt((stone.x - x) ** 2 + (stone.y - y) ** 2);
                if (distance < 25 && stone.stone > 0) {
                    this.socket.emit('collectResource', { 
                        resourceId: stone.id, 
                        type: 'stone' 
                    });
                    resourceClicked = true;
                    break;
                }
            }
        }
        
        // Если не кликнули по ресурсу - двигаемся
        if (!resourceClicked) {
            this.myPlayer.x = x;
            this.myPlayer.y = y;
            this.socket.emit('playerMove', { x: x, y: y });
        }
    }

    updateUI() {
        // Количество игроков
        const onlineCount = Object.keys(this.otherPlayers).length + 1;
        document.getElementById('onlineCount').textContent = onlineCount;
        
        // Список игроков
        this.updatePlayersList();
    }

    updateResourceDisplay() {
        document.getElementById('woodCount').textContent = this.myPlayer.wood;
        document.getElementById('stoneCount').textContent = this.myPlayer.stone;
    }

    updatePlayersList() {
        const list = document.getElementById('playersList');
        list.innerHTML = '<div style="color: #4ecdc4; margin-bottom: 10px;">👥 Игроки:</div>';
        
        // Наш игрок
        const myPlayerItem = document.createElement('div');
        myPlayerItem.className = 'player-item';
        myPlayerItem.style.color = this.myPlayer.color;
        myPlayerItem.textContent = `${this.myPlayer.name} (Вы) - 🌳${this.myPlayer.wood} ⛰️${this.myPlayer.stone}`;
        list.appendChild(myPlayerItem);
        
        // Другие игроки
        Object.values(this.otherPlayers).forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.style.color = player.color;
            playerItem.textContent = `${player.name} - 🌳${player.wood} ⛰️${player.stone}`;
            list.appendChild(playerItem);
        });
    }

    render() {
        // Очистка
        this.ctx.fillStyle = '#1e2b3e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем деревья
        this.resources.trees.forEach(tree => {
            if (tree.wood > 0) {
                // Ствол
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(tree.x - 5, tree.y - 5, 10, 20);
                
                // Крона
                this.ctx.fillStyle = '#2a5934';
                this.ctx.beginPath();
                this.ctx.arc(tree.x, tree.y - 10, 25, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Количество ресурсов
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(tree.wood, tree.x, tree.y + 30);
            }
        });
        
        // Рисуем камни
        this.resources.stones.forEach(stone => {
            if (stone.stone > 0) {
                this.ctx.fillStyle = '#5a6268';
                this.ctx.beginPath();
                this.ctx.arc(stone.x, stone.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Текстура
                this.ctx.fillStyle = '#495057';
                this.ctx.beginPath();
                this.ctx.arc(stone.x + 5, stone.y - 3, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Количество ресурсов
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(stone.stone, stone.x, stone.y + 30);
            }
        });
        
        // Рисуем других игроков
        Object.values(this.otherPlayers).forEach(player => {
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Имя
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
        });
        
        // Рисуем нашего игрока
        this.ctx.fillStyle = this.myPlayer.color;
        this.ctx.beginPath();
        this.ctx.arc(this.myPlayer.x, this.myPlayer.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Обводка
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Имя
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.myPlayer.name, this.myPlayer.x, this.myPlayer.y - 30);
    }

    gameLoop() {
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры
window.addEventListener('load', () => {
    new RustEchkaGame();
});
