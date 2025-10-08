import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Раздаем статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Состояние игры
const gameState = {
  players: {},
  resources: {
    trees: [
      { id: 1, x: 200, y: 150, wood: 5 },
      { id: 2, x: 400, y: 300, wood: 5 },
      { id: 3, x: 600, y: 200, wood: 5 },
      { id: 4, x: 300, y: 500, wood: 5 }
    ],
    stones: [
      { id: 1, x: 250, y: 350, stone: 3 },
      { id: 2, x: 450, y: 250, stone: 3 },
      { id: 3, x: 350, y: 450, stone: 3 }
    ]
  }
};

// Цвета для игроков
const colors = ['#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];

io.on('connection', (socket) => {
  console.log('🔗 Игрок подключен:', socket.id);
  
  // Создаем нового игрока
  gameState.players[socket.id] = {
    id: socket.id,
    x: 400,
    y: 300,
    color: colors[Math.floor(Math.random() * colors.length)],
    wood: 0,
    stone: 0,
    name: `Игрок_${socket.id.slice(0, 4)}`
  };
  
  // Отправляем состояние новому игроку
  socket.emit('gameInit', {
    playerId: socket.id,
    gameState: gameState
  });
  
  // Сообщаем всем о новом игроке
  socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
  
  // Движение игрока
  socket.on('playerMove', (data) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].x = data.x;
      gameState.players[socket.id].y = data.y;
      
      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        x: data.x,
        y: data.y
      });
    }
  });
  
  // Сбор ресурсов
  socket.on('collectResource', (data) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    
    if (data.type === 'tree') {
      const tree = gameState.resources.trees.find(t => t.id === data.resourceId);
      if (tree && tree.wood > 0) {
        tree.wood--;
        player.wood++;
        
        io.emit('resourceUpdated', {
          resourceId: data.resourceId,
          type: 'tree',
          amount: tree.wood
        });
        
        io.emit('playerResources', {
          playerId: socket.id,
          wood: player.wood,
          stone: player.stone
        });
      }
    }
    
    if (data.type === 'stone') {
      const stone = gameState.resources.stones.find(s => s.id === data.resourceId);
      if (stone && stone.stone > 0) {
        stone.stone--;
        player.stone++;
        
        io.emit('resourceUpdated', {
          resourceId: data.resourceId,
          type: 'stone',
          amount: stone.stone
        });
        
        io.emit('playerResources', {
          playerId: socket.id,
          wood: player.wood,
          stone: player.stone
        });
      }
    }
  });
  
  // Отключение
  socket.on('disconnect', () => {
    console.log('❌ Игрок отключился:', socket.id);
    delete gameState.players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 RustEchka запущена: http://localhost:${PORT}`);
});
