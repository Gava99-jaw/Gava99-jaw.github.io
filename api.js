const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Имитация API для работы с Telegram ботом
app.post('/api/send-to-bot', (req, res) => {
  const { fileData } = req.body;
  
  // Здесь должен быть код для реальной отправки в Telegram
  // Используйте библиотеку node-telegram-bot-api
  
  res.json({
    success: true,
    message: `Файл "${fileData.name}" отправлен боту`
  });
});

app.listen(3000, () => {
  console.log('Сервер запущен на http://localhost:3000');
});
