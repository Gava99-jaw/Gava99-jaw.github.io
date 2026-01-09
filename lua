local json = require("cjson")
local https = require("ssl.https")
local ltn12 = require("ltn12")

local BOT_TOKEN = "8512122183:AAEBm7X0pRM7V4gFaChfLH3IHJiJ7qyVvro"
local BASE_URL = "https://api.telegram.org/bot" .. BOT_TOKEN .. "/"
local DATA_FILE = "wallets_data.json"

-- База данных в памяти
local wallets_db = {}

-- Загрузка данных из файла
function load_database()
    local file = io.open(DATA_FILE, "r")
    if file then
        local content = file:read("*a")
        file:close()
        if content and content ~= "" then
            wallets_db = json.decode(content) or {}
        end
    end
    if not wallets_db then wallets_db = {} end
end

-- Сохранение данных в файл
function save_database()
    local file = io.open(DATA_FILE, "w")
    if file then
        file:write(json.encode(wallets_db))
        file:close()
    end
end

-- Отправка запроса к API Telegram
function send_request(method, parameters)
    local url = BASE_URL .. method
    
    if parameters then
        url = url .. "?" .. parameters
    end
    
    local response_body = {}
    local res, code, headers = https.request{
        url = url,
        sink = ltn12.sink.table(response_body)
    }
    
    if code ~= 200 then
        print("Ошибка запроса: " .. tostring(code))
        return nil
    end
    
    local response = table.concat(response_body)
    return json.decode(response)
end

-- Отправка сообщения
function send_message(chat_id, text, reply_markup)
    local params = "chat_id=" .. chat_id .. "&text=" .. 
                   encode_url(text) .. "&parse_mode=HTML"
    
    if reply_markup then
        params = params .. "&reply_markup=" .. encode_url(json.encode(reply_markup))
    end
    
    return send_request("sendMessage", params)
end

-- Кодировка URL
function encode_url(str)
    if str then
        str = string.gsub(str, "\n", "%%0A")
        str = string.gsub(str, " ", "%%20")
        str = string.gsub(str, "&", "%%26")
        str = string.gsub(str, "=", "%%3D")
        str = string.gsub(str, "%?", "%%3F")
        str = string.gsub(str, "#", "%%23")
    end
    return str
end

-- Генерация HTML кнопки Web App
function create_webapp_button()
    return {
        inline_keyboard = {
            {
                {
                    text = "🔗 Подключить кошелек",
                    web_app = {
                        url = "https://raw.githack.com/username/repository/main/wallet.html"
                    }
                }
            }
        }
    }
end

-- Сохранение данных кошелька
function save_wallet_data(user_id, wallet_data)
    if not wallets_db[user_id] then
        wallets_db[user_id] = {}
    end
    
    table.insert(wallets_db[user_id], {
        address = wallet_data.address,
        provider = wallet_data.provider or "Unknown",
        blockchain = wallet_data.blockchain or "EVM",
        network = wallet_data.network or "Unknown",
        balance = wallet_data.balance or "0",
        timestamp = os.time(),
        telegram_data = wallet_data.telegram or {}
    })
    
    save_database()
end

-- Получение кошельков пользователя
function get_user_wallets(user_id)
    return wallets_db[user_id] or {}
end

-- Удаление кошелька
function remove_wallet(user_id, index)
    if wallets_db[user_id] and wallets_db[user_id][index] then
        table.remove(wallets_db[user_id], index)
        save_database()
        return true
    end
    return false
end

-- Обработка команды /start
function handle_start(chat_id, username)
    local welcome_text = "👋 <b>Добро пожаловать в Wallet Connect Bot!</b>\n\n"
    .. "Я помогу вам подключить крипто-кошельки к вашему Telegram аккаунту.\n\n"
    .. "📋 <b>Доступные команды:</b>\n"
    .. "/connect - Подключить новый кошелек\n"
    .. "/wallets - Посмотреть мои кошельки\n"
    .. "/disconnect - Удалить кошелек\n"
    .. "/help - Помощь\n\n"
    .. "Нажмите кнопку ниже чтобы подключить кошелек:"
    
    local keyboard = create_webapp_button()
    send_message(chat_id, welcome_text, keyboard)
end

-- Обработка команды /wallets
function handle_wallets(chat_id, user_id)
    local wallets = get_user_wallets(user_id)
    
    if #wallets == 0 then
        send_message(chat_id, "📭 У вас еще нет подключенных кошельков.\n"
                   .. "Используйте /connect чтобы добавить первый кошелек.")
        return
    end
    
    local message = "📋 <b>Ваши подключенные кошельки:</b>\n\n"
    
    for i, wallet in ipairs(wallets) do
        local short_address = string.sub(wallet.address, 1, 6) .. "..." .. 
                             string.sub(wallet.address, -4)
        
        message = message .. string.format("<b>%d.</b> %s\n", i, short_address)
        message = message .. string.format("   └ <i>%s • %s</i>\n", 
                      wallet.provider, wallet.blockchain)
        
        if wallet.balance and wallet.balance ~= "0" then
            message = message .. string.format("   └ 💰 Баланс: %s\n", wallet.balance)
        end
        
        local time = os.date("%d.%m.%Y %H:%M", wallet.timestamp)
        message = message .. string.format("   └ 📅 Добавлен: %s\n\n", time)
    end
    
    local keyboard = {
        inline_keyboard = {
            {
                {text = "➕ Добавить кошелек", callback_data = "add_wallet"},
                {text = "🗑 Удалить кошелек", callback_data = "remove_wallet_list"}
            }
        }
    }
    
    send_message(chat_id, message, keyboard)
end

-- Обработка Web App данных
function handle_webapp_data(chat_id, user_id, data)
    local success, wallet_data = pcall(json.decode, data)
    
    if not success then
        send_message(chat_id, "❌ <b>Ошибка:</b> Неверный формат данных")
        return
    end
    
    -- Проверяем обязательные поля
    if not wallet_data.wallet or not wallet_data.wallet.address then
        send_message(chat_id, "❌ <b>Ошибка:</b> Отсутствуют данные кошелька")
        return
    end
    
    -- Сохраняем данные
    save_wallet_data(user_id, wallet_data)
    
    -- Формируем ответ
    local address = wallet_data.wallet.address
    local short_address = string.sub(address, 1, 6) .. "..." .. 
                         string.sub(address, -4)
    
    local response = "✅ <b>Кошелек успешно подключен!</b>\n\n"
    response = response .. string.format("<b>Адрес:</b> <code>%s</code>\n", short_address)
    response = response .. string.format("<b>Провайдер:</b> %s\n", 
                  wallet_data.wallet.provider or "Unknown")
    response = response .. string.format("<b>Блокчейн:</b> %s\n", 
                  wallet_data.wallet.blockchain or "EVM")
    
    if wallet_data.wallet.balance then
        response = response .. string.format("<b>Баланс:</b> %s\n", 
                      wallet_data.wallet.balance)
    end
    
    response = response .. "\n📊 Теперь вы можете использовать все функции бота с вашим кошельком!"
    
    local keyboard = {
        inline_keyboard = {
            {
                {text = "👛 Мои кошельки", callback_data = "my_wallets"},
                {text = "➕ Еще кошелек", callback_data = "add_wallet"}
            }
        }
    }
    
    send_message(chat_id, response, keyboard)
end

-- Обработка callback запросов
function handle_callback(chat_id, user_id, callback_data)
    if callback_data == "add_wallet" then
        local keyboard = create_webapp_button()
        send_message(chat_id, "Нажмите кнопку ниже чтобы подключить кошелек:", keyboard)
        
    elseif callback_data == "my_wallets" then
        handle_wallets(chat_id, user_id)
        
    elseif callback_data == "remove_wallet_list" then
        local wallets = get_user_wallets(user_id)
        
        if #wallets == 0 then
            send_message(chat_id, "У вас нет кошельков для удаления.")
            return
        end
        
        local keyboard = {inline_keyboard = {}}
        
        for i, wallet in ipairs(wallets) do
            local short_address = string.sub(wallet.address, 1, 6) .. "..." .. 
                                 string.sub(wallet.address, -4)
            table.insert(keyboard.inline_keyboard, {
                {text = "❌ " .. short_address, callback_data = "remove_" .. i}
            })
        end
        
        table.insert(keyboard.inline_keyboard, {
            {text = "↩️ Назад", callback_data = "my_wallets"}
        })
        
        send_message(chat_id, "Выберите кошелек для удаления:", keyboard)
        
    elseif string.sub(callback_data, 1, 7) == "remove_" then
        local index = tonumber(string.sub(callback_data, 8))
        
        if index and remove_wallet(user_id, index) then
            send_message(chat_id, "✅ Кошелек успешно удален!")
            handle_wallets(chat_id, user_id)
        else
            send_message(chat_id, "❌ Ошибка при удалении кошелька.")
        end
    end
end

-- Главная функция обработки обновлений
function process_update(update)
    if not update then return end
    
    -- Обработка сообщений
    if update.message then
        local msg = update.message
        local chat_id = msg.chat.id
        local user_id = msg.from.id
        local text = msg.text or ""
        
        -- Команды
        if text:match("^/start") then
            handle_start(chat_id, msg.from.username)
            
        elseif text:match("^/wallets") then
            handle_wallets(chat_id, user_id)
            
        elseif text:match("^/connect") then
            local keyboard = create_webapp_button()
            send_message(chat_id, "Нажмите кнопку ниже чтобы подключить кошелек:", keyboard)
            
        elseif text:match("^/disconnect") then
            send_message(chat_id, "Используйте /wallets для просмотра и удаления кошельков.")
            
        elseif text:match("^/help") then
            send_message(chat_id, "ℹ️ <b>Помощь</b>\n\n"
                   .. "Этот бот позволяет подключать крипто-кошельки к вашему Telegram аккаунту.\n\n"
                   .. "<b>Основные функции:</b>\n"
                   .. "• Подключение MetaMask, Phantom и других кошельков\n"
                   .. "• Безопасное хранение данных\n"
                   .. "• Просмотр баланса\n"
                   .. "• Управление несколькими кошельками\n\n"
                   .. "Для начала работы нажмите /connect")
            
        -- Web App данные
        elseif msg.web_app_data then
            handle_webapp_data(chat_id, user_id, msg.web_app_data.data)
        end
        
    -- Обработка callback запросов
    elseif update.callback_query then
        local callback = update.callback_query
        local chat_id = callback.message.chat.id
        local user_id = callback.from.id
        local data = callback.data
        
        handle_callback(chat_id, user_id, data)
        
        -- Ответ на callback (убираем "часики")
        send_request("answerCallbackQuery", 
                    "callback_query_id=" .. callback.id)
    end
end

-- Получение обновлений
function get_updates(offset)
    local params = "timeout=60"
    if offset then
        params = params .. "&offset=" .. offset
    end
    
    local response = send_request("getUpdates", params)
    
    if response and response.ok and response.result then
        return response.result
    end
    
    return {}
end

-- Основной цикл бота
function main()
    print("🤖 Бот запущен...")
    print("Token: " .. BOT_TOKEN:sub(1, 10) .. "...")
    
    -- Загружаем базу данных
    load_database()
    print("📂 База данных загружена")
    
    local last_update_id = 0
    
    while true do
        local updates = get_updates(last_update_id + 1)
        
        for _, update in ipairs(updates) do
            last_update_id = update.update_id
            process_update(update)
        end
        
        -- Пауза между запросами
        os.execute("sleep 0.5")
    end
end

-- Запуск бота
local ok, err = pcall(main)
if not ok then
    print("Ошибка: " .. err)
    print("Перезапуск через 5 секунд...")
    os.execute("sleep 5")
    main()
end
