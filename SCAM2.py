from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
import json
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Токен бота (получите у @BotFather)
BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"

async def start(update: Update, context):
    """Обработчик команды /start"""
    keyboard = [
        [InlineKeyboardButton(
            text="🔗 Подключить кошелек", 
            web_app=WebAppInfo(url="https://yourdomain.com/wallet.html")  # URL вашей HTML страницы
        )]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Привет! Я помогу подключить ваш крипто-кошелек.\n\n"
        "Нажмите кнопку ниже чтобы начать:",
        reply_markup=reply_markup
    )

async def handle_web_app_data(update: Update, context):
    """Обработка данных из Web App"""
    try:
        # Получаем данные из Web App
        data = json.loads(update.message.web_app_data.data)
        
        # Извлекаем информацию
        telegram_user = data.get('telegram', {})
        wallet_info = data.get('wallet', {})
        
        # Сохраняем в базу данных (здесь пример)
        user_id = telegram_user.get('id')
        wallet_address = wallet_info.get('address')
        provider = wallet_info.get('provider')
        
        logger.info(f"User {user_id} connected wallet {wallet_address} via {provider}")
        
        # Отправляем подтверждение пользователю
        await update.message.reply_text(
            f"✅ Кошелек успешно подключен!\n\n"
            f"🆔 Ваш ID: {user_id}\n"
            f"👛 Адрес кошелька: {wallet_address[:6]}...{wallet_address[-4:]}\n"
            f"🔧 Провайдер: {provider}\n\n"
            f"Теперь вы можете использовать функционал бота с вашим кошельком."
        )
        
    except Exception as e:
        logger.error(f"Error processing web app data: {e}")
        await update.message.reply_text("❌ Произошла ошибка при обработке данных")

async def my_wallets(update: Update, context):
    """Команда для просмотра подключенных кошельков"""
    # Здесь должна быть логика получения из базы данных
    await update.message.reply_text(
        "📋 Ваши подключенные кошельки:\n\n"
        "1. 0x1234...5678 (MetaMask) - Основной\n"
        "2. A1b2...C3d4 (Phantom) - Solana\n\n"
        "Используйте /disconnect чтобы отключить кошелек"
    )

def main():
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("wallets", my_wallets))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    
    # Запуск бота
    application.run_polling()

if __name__ == "__main__":
    main()