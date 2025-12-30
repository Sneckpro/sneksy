# Пошаговая инструкция по запуску

## Быстрый старт (без Apple/Google Wallet)

Если вы хотите просто протестировать систему без настройки Apple Wallet и Google Wallet:

### 1. Установите зависимости

```bash
cd wallet_app
npm install
```

### 2. Запустите сервер

```bash
npm start
```

### 3. Откройте приложение

- **Регистрация клиентов**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin

Система будет работать, но без генерации passes для Apple Wallet и Google Wallet (вы увидите ошибки в консоли, но это не критично).

## Полная настройка с Apple Wallet

### Шаг 1: Apple Developer Account

1. Зарегистрируйтесь на https://developer.apple.com ($99/год)
2. Подтвердите аккаунт

### Шаг 2: Создайте Pass Type ID

1. Войдите в https://developer.apple.com/account
2. Перейдите в **Certificates, Identifiers & Profiles**
3. Выберите **Identifiers** → **Pass Type IDs**
4. Нажмите **+** для создания нового
5. Введите описание: "Restaurant Loyalty Card"
6. Введите Identifier: `pass.com.yourrestaurant.loyalty` (замените yourrestaurant на свой домен)
7. Сохраните

### Шаг 3: Создайте Pass Type Certificate

1. В разделе **Pass Type IDs** выберите созданный ID
2. Нажмите **Create Certificate**
3. Следуйте инструкциям для создания CSR (Certificate Signing Request):
   - Откройте **Keychain Access** на Mac
   - Меню: **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - Введите ваш email
   - Выберите "Saved to disk"
   - Сохраните файл
4. Загрузите CSR на сайт Apple
5. Скачайте созданный сертификат (pass.cer)
6. Двойной клик по файлу для установки в Keychain

### Шаг 4: Экспортируйте сертификаты

1. Откройте **Keychain Access**
2. Найдите сертификат Pass Type ID
3. Разверните и найдите приватный ключ
4. Выберите оба (сертификат + ключ)
5. Правый клик → **Export 2 items**
6. Сохраните как `Certificates.p12` с паролем

### Шаг 5: Скачайте WWDR Certificate

1. Перейдите на https://www.apple.com/certificateauthority/
2. Скачайте **Worldwide Developer Relations - G4** (файл .cer)

### Шаг 6: Конвертируйте сертификаты

Создайте папку для сертификатов:

```bash
cd wallet_app
mkdir certs
```

Конвертируйте WWDR Certificate:

```bash
openssl x509 -inform DER -outform PEM -in ~/Downloads/AppleWWDRCAG4.cer -out ./certs/WWDR.pem
```

Конвертируйте Pass Certificate и Key:

```bash
# Экспорт сертификата
openssl pkcs12 -in ~/Downloads/Certificates.p12 -clcerts -nokeys -out ./certs/signerCert.pem

# Экспорт приватного ключа
openssl pkcs12 -in ~/Downloads/Certificates.p12 -nocerts -out ./certs/signerKey.pem
```

Введите пароль от .p12 файла.

### Шаг 7: Настройте модель Pass

Создайте папку для модели:

```bash
mkdir apple-pass-model
```

Создайте файл `apple-pass-model/pass.json`:

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.yourrestaurant.loyalty",
  "teamIdentifier": "YOUR_TEAM_ID",
  "logoText": "Мой Ресторан",
  "description": "Программа лояльности",
  "organizationName": "Мой Ресторан"
}
```

Замените:
- `pass.com.yourrestaurant.loyalty` на ваш Pass Type ID
- `YOUR_TEAM_ID` на ваш Team ID (найдите на https://developer.apple.com/account)

### Шаг 8: Добавьте изображения

Создайте следующие изображения и поместите в `apple-pass-model/`:

- **logo.png** (320x100px) - логотип ресторана
- **logo@2x.png** (640x200px) - логотип для Retina
- **icon.png** (58x58px) - иконка
- **icon@2x.png** (116x116px) - иконка для Retina

Можно использовать любой графический редактор или онлайн-сервисы.

### Шаг 9: Обновите .env

Откройте `.env` и заполните:

```env
APPLE_TEAM_IDENTIFIER=YOUR_TEAM_ID
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourrestaurant.loyalty
APPLE_WWDR_CERTIFICATE_PATH=./certs/WWDR.pem
APPLE_SIGNER_CERTIFICATE_PATH=./certs/signerCert.pem
APPLE_SIGNER_KEY_PATH=./certs/signerKey.pem
APPLE_SIGNER_KEY_PASSPHRASE=your_password_for_p12
```

### Шаг 10: Запустите и проверьте

```bash
npm start
```

Зарегистрируйте тестового пользователя и попробуйте добавить карту в Apple Wallet!

## Полная настройка с Google Wallet

### Шаг 1: Создайте проект в Google Cloud

1. Перейдите на https://console.cloud.google.com
2. Нажмите **Create Project**
3. Введите название: "Restaurant Wallet"
4. Создайте проект

### Шаг 2: Включите Google Wallet API

1. В меню выберите **APIs & Services** → **Library**
2. Найдите "Google Wallet API"
3. Нажмите **Enable**

### Шаг 3: Создайте Service Account

1. Перейдите в **IAM & Admin** → **Service Accounts**
2. Нажмите **Create Service Account**
3. Введите имя: "wallet-service"
4. Нажмите **Create and Continue**
5. В разделе "Grant this service account access to project":
   - Добавьте роль: **Owner** (для тестирования)
6. Нажмите **Continue** → **Done**

### Шаг 4: Создайте JSON ключ

1. Найдите созданный Service Account
2. Нажмите на него
3. Перейдите в **Keys**
4. Нажмите **Add Key** → **Create new key**
5. Выберите **JSON**
6. Ключ скачается автоматически
7. Переименуйте в `google-service-account.json`
8. Переместите в папку `wallet_app/certs/`

### Шаг 5: Настройте Google Pay & Wallet Console

1. Перейдите на https://pay.google.com/business/console
2. Войдите с аккаунтом Google Cloud
3. Создайте бизнес-профиль (если нужно)
4. Скопируйте ваш **Issuer ID** (длинное число)

### Шаг 6: Обновите .env

```env
GOOGLE_ISSUER_ID=3388000000022334455
GOOGLE_SERVICE_ACCOUNT_EMAIL=wallet-service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./certs/google-service-account.json
```

Замените значения на свои из Google Cloud Console.

### Шаг 7: Запустите и проверьте

```bash
npm start
```

Зарегистрируйте пользователя и попробуйте добавить карту в Google Wallet!

## Проверка работы

### 1. Регистрация клиента

1. Откройте http://localhost:3000
2. Заполните форму:
   - Имя: Иван
   - Фамилия: Петров
   - Email: ivan@example.com
   - Телефон: +7 999 123 45 67
3. Нажмите "Зарегистрироваться"
4. Должны появиться кнопки для добавления в Apple Wallet и Google Wallet

### 2. Добавление транзакции

1. Откройте http://localhost:3000/admin
2. Найдите зарегистрированного клиента
3. Нажмите "Добавить покупку"
4. Введите сумму: 45000
5. Нажмите "Добавить"
6. Скидка должна автоматически измениться с 3% на 5%
7. Карта в кошельке обновится автоматически

## Типичные проблемы

### Apple Wallet не открывается

- Убедитесь, что используете iPhone/iPad (симулятор не поддерживает Wallet)
- Проверьте, что сервер доступен извне (не localhost)
- Используйте HTTPS в продакшене

### Google Wallet выдает ошибку

- Проверьте, что Service Account имеет правильные права
- Убедитесь, что Google Wallet API включен
- Проверьте Issuer ID

### Ошибки сертификатов

- Проверьте пути к файлам в .env
- Убедитесь, что пароль правильный
- Попробуйте пересоздать сертификаты

### База данных не создается

- Проверьте права на запись в папке
- Убедитесь, что SQLite установлен (входит в Node.js)

## Развертывание на сервере

Для продакшена вам нужно:

1. **Домен с HTTPS** (обязательно!)
2. **VPS или хостинг** с Node.js
3. **Обновить BASE_URL** в .env на ваш домен

Пример для Ubuntu:

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонирование и настройка
git clone <your-repo>
cd wallet_app
npm install
nano .env  # настройте BASE_URL и другие параметры

# Установка PM2
sudo npm install -g pm2
pm2 start server.js --name wallet
pm2 startup
pm2 save

# Настройка Nginx
sudo apt install nginx
# Настройте reverse proxy на порт 3000
```

## Готово!

Теперь у вас есть полностью функциональная система электронных карт лояльности для ресторана!

Для вопросов смотрите README.md или логи приложения.
