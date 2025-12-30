# 🍽️ Электронный кошелёк для ресторана

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Полнофункциональная система накопительных карт лояльности с интеграцией Apple Wallet, Google Wallet и кассовой системы Syrve (iiko).

[🚀 Демо](https://lachrymose-virilocally-markus.ngrok-free.dev) | [📖 Документация](#документация) | [🐛 Сообщить об ошибке](https://github.com/Sneckpro/sneksy/issues)

## Возможности

- Регистрация клиентов через веб-форму
- Автоматическая генерация карт для Apple Wallet и Google Wallet
- Накопительная система скидок:
  - При регистрации: **3%**
  - После 40,000₽: **5%**
  - После 100,000₽: **10%**
  - После 200,000₽: **15%**
- Админ-панель для управления транзакциями
- QR-коды для быстрой регистрации
- База данных пользователей и транзакций
- Автоматическое обновление карт при изменении уровня скидки

## Технологии

- **Backend**: Node.js, Express.js
- **База данных**: SQLite (легко мигрировать на PostgreSQL)
- **Apple Wallet**: passkit-generator
- **Google Wallet**: Google Wallet API
- **Frontend**: Vanilla JavaScript, CSS

## Установка

### 1. Установка зависимостей

```bash
cd wallet_app
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные в `.env`:

```env
PORT=3000
DB_PATH=./database.sqlite

# Конфигурация Apple Wallet
APPLE_TEAM_IDENTIFIER=YOUR_TEAM_ID
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourrestaurant.loyalty
APPLE_WWDR_CERTIFICATE_PATH=./certs/WWDR.pem
APPLE_SIGNER_CERTIFICATE_PATH=./certs/signerCert.pem
APPLE_SIGNER_KEY_PATH=./certs/signerKey.pem
APPLE_SIGNER_KEY_PASSPHRASE=your_passphrase

# Конфигурация Google Wallet
GOOGLE_ISSUER_ID=YOUR_ISSUER_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./certs/google-service-account.json

# Конфигурация ресторана
RESTAURANT_NAME=Ваш Ресторан
RESTAURANT_DESCRIPTION=Программа лояльности
BASE_URL=http://localhost:3000
```

### 3. Настройка Apple Wallet

Для работы с Apple Wallet необходимо:

1. **Apple Developer Account** (платный, $99/год)
2. **Создать Pass Type ID**:
   - Перейдите в [Apple Developer Portal](https://developer.apple.com/account)
   - Certificates, Identifiers & Profiles → Identifiers → Pass Type IDs
   - Создайте новый Pass Type ID (например: `pass.com.yourrestaurant.loyalty`)

3. **Создать сертификаты**:
   ```bash
   mkdir certs
   ```

4. **Получить сертификаты**:
   - **WWDR Certificate**: Скачайте с [Apple PKI](https://www.apple.com/certificateauthority/)
   - **Pass Type Certificate**: Создайте в Apple Developer Portal
   - **Private Key**: Экспортируйте из Keychain Access

5. **Конвертировать сертификаты в PEM формат**:
   ```bash
   # WWDR Certificate
   openssl x509 -inform DER -outform PEM -in AppleWWDRCA.cer -out ./certs/WWDR.pem

   # Pass Certificate
   openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out ./certs/signerCert.pem
   openssl pkcs12 -in Certificates.p12 -nocerts -out ./certs/signerKey.pem
   ```

6. **Создать папку модели pass**:
   ```bash
   mkdir -p apple-pass-model
   ```

7. **Добавить файл pass.json** в папку `apple-pass-model/`:
   ```json
   {
     "formatVersion": 1,
     "passTypeIdentifier": "pass.com.yourrestaurant.loyalty",
     "teamIdentifier": "YOUR_TEAM_ID",
     "logoText": "Ваш Ресторан",
     "description": "Программа лояльности",
     "organizationName": "Ваш Ресторан"
   }
   ```

8. **Добавить изображения** в папку `apple-pass-model/`:
   - `logo.png` (320x100px)
   - `logo@2x.png` (640x200px)
   - `icon.png` (58x58px)
   - `icon@2x.png` (116x116px)

### 4. Настройка Google Wallet

1. **Создать проект в Google Cloud Console**:
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com)
   - Создайте новый проект

2. **Включить Google Wallet API**:
   - APIs & Services → Enable APIs and Services
   - Найдите "Google Wallet API" и включите

3. **Создать Service Account**:
   - IAM & Admin → Service Accounts
   - Создайте новый Service Account
   - Выдайте роль "Google Wallet API Issuer"

4. **Получить JSON ключ**:
   - Создайте ключ для Service Account
   - Скачайте JSON файл
   - Сохраните как `./certs/google-service-account.json`

5. **Получить Issuer ID**:
   - Перейдите в [Google Pay & Wallet Console](https://pay.google.com/business/console)
   - Скопируйте ваш Issuer ID

6. **Создать Loyalty Class** (опционально, можно через API):
   - В Google Pay & Wallet Console создайте Loyalty Class
   - Или запустите приложение, и класс создастся автоматически

### 5. Запуск приложения

```bash
# Режим разработки (с автоперезагрузкой)
npm run dev

# Или обычный запуск
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

## Использование

### Для клиентов

1. Откройте http://localhost:3000
2. Заполните форму регистрации (имя, фамилия, email, телефон)
3. После регистрации получите ссылки на добавление карты в Apple Wallet или Google Wallet
4. Добавьте карту в свой кошелёк
5. Предъявляйте карту при каждой покупке

### Для администраторов

1. Откройте http://localhost:3000/admin
2. Просматривайте список всех зарегистрированных клиентов
3. Используйте поиск для быстрого нахождения клиента
4. Нажмите "Добавить покупку" для записи транзакции
5. Скидка применяется автоматически, карта обновляется

### QR-код для регистрации

В админ-панели есть QR-код, который можно:
- Распечатать и разместить в ресторане
- Отправить клиентам
- Разместить на сайте или в социальных сетях

## API Endpoints

### Регистрация пользователя
```
POST /api/register
Body: { email, phone, first_name, last_name }
```

### Получить пользователя
```
GET /api/user/:id
GET /api/user/card/:serial
```

### Добавить транзакцию
```
POST /api/transaction
Body: { user_id, amount, description }
```

### Получить транзакции пользователя
```
GET /api/transactions/:userId
```

### Получить всех пользователей
```
GET /api/users
```

### Получить QR-код регистрации
```
GET /api/qr/registration
```

## Структура проекта

```
wallet_app/
├── server.js                 # Основной сервер
├── database.js              # Работа с базой данных
├── apple-wallet.js          # Генерация Apple Wallet passes
├── google-wallet.js         # Генерация Google Wallet passes
├── package.json             # Зависимости
├── .env                     # Конфигурация (не в git)
├── .env.example            # Пример конфигурации
├── certs/                   # Сертификаты (не в git)
│   ├── WWDR.pem
│   ├── signerCert.pem
│   ├── signerKey.pem
│   └── google-service-account.json
├── apple-pass-model/        # Шаблон Apple Pass
│   ├── pass.json
│   ├── logo.png
│   └── icon.png
├── public/                  # Frontend файлы
│   ├── index.html          # Форма регистрации
│   └── admin.html          # Админ-панель
├── passes/                  # Сгенерированные passes (не в git)
└── database.sqlite         # База данных (не в git)
```

## База данных

### Таблица users
- `id` - UUID пользователя
- `email` - Email (уникальный)
- `phone` - Телефон
- `first_name` - Имя
- `last_name` - Фамилия
- `total_spent` - Общая сумма покупок
- `discount_percent` - Текущая скидка (3%, 5%, 10%, 15%)
- `pass_serial` - Номер карты
- `apple_pass_url` - URL для Apple Wallet
- `google_pass_url` - URL для Google Wallet
- `created_at` - Дата регистрации
- `updated_at` - Дата последнего обновления

### Таблица transactions
- `id` - UUID транзакции
- `user_id` - ID пользователя
- `amount` - Сумма покупки (после применения скидки)
- `discount_applied` - Размер примененной скидки
- `description` - Описание покупки
- `created_at` - Дата транзакции

## Безопасность

⚠️ **Важно**: Для продакшена:

1. Используйте HTTPS (обязательно для Apple Wallet и Google Wallet)
2. Добавьте аутентификацию для админ-панели
3. Используйте более безопасную базу данных (PostgreSQL, MySQL)
4. Настройте CORS правильно
5. Добавьте rate limiting для API
6. Валидируйте все входящие данные
7. Храните сертификаты в безопасном месте

## Развертывание

### 🚀 Быстрый старт с ngrok (для тестирования)

```bash
# 1. Установите ngrok
brew install ngrok/ngrok/ngrok

# 2. Получите токен: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN

# 3. Запустите сервер
npm start

# 4. В другом терминале запустите ngrok
ngrok http 3000

# 5. Обновите BASE_URL в .env на полученный URL
# Например: https://abc-123.ngrok-free.dev
```

**Готово!** Ваш сайт доступен в интернете через HTTPS! 🎉

Подробнее: [DEPLOYMENT.md](DEPLOYMENT.md)

### 💻 Продакшен на VPS

**Рекомендуемые провайдеры:**
- [DigitalOcean](https://digitalocean.com) ($5/мес)
- [Timeweb](https://timeweb.com) (от 299₽/мес)
- [Vultr](https://vultr.com) ($5/мес)

**Быстрая установка (Ubuntu 22.04):**

```bash
# Установка Node.js и зависимостей
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Клонирование и настройка
git clone https://github.com/Sneckpro/sneksy.git
cd sneksy
npm install
cp .env.example .env
nano .env  # Заполните настройки

# PM2 для автозапуска
sudo npm install -g pm2
pm2 start server.js --name wallet-app
pm2 startup
pm2 save

# Nginx + SSL
sudo apt install nginx certbot python3-certbot-nginx -y
# Настройте Nginx (см. DEPLOYMENT.md)
sudo certbot --nginx -d your-domain.com
```

Полная инструкция: [DEPLOYMENT.md](DEPLOYMENT.md)

### ☁️ Автоматический деплой

**Railway.app / Render.com:**
1. Подключите GitHub репозиторий
2. Настройте переменные окружения
3. Деплой происходит автоматически

Подробнее: [DEPLOYMENT.md](DEPLOYMENT.md)

## Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте логи: `console.log` в коде
2. Убедитесь, что все сертификаты настроены правильно
3. Проверьте переменные окружения в .env

## Лицензия

MIT

## Автор

Разработано с помощью Claude Code
