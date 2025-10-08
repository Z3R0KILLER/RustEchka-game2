import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Раздаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-simple.html'));
});

// Простой API для теста
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'RustEchka работает!', 
    players: 1,
    version: '1.0'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 RustEchka Simple запущена на порту ${PORT}`);
});
