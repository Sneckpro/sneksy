# 🚀 Развертывание приложения

## Варианты деплоя

### 1. 🌐 ngrok (Быстрое тестирование)

Самый быстрый способ сделать приложение доступным в интернете.

#### Установка ngrok:

**macOS:**
```bash
brew install ngrok/ngrok/ngrok
```

**Или напрямую:**
```bash
curl -Lo ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip
unzip ngrok.zip
mv ngrok ~/bin/
```

#### Настройка:

1. Зарегистрируйтесь: https://dashboard.ngrok.com/signup
2. Получите authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Настройте токен:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

#### Запуск:

```bash
# Запустите ваш сервер
npm start

# В другом терминале запустите ngrok
ngrok http 3000
```

Вы получите публичный URL типа: `https://abc-123.ngrok-free.dev`

#### Обновите .env:

```env
BASE_URL=https://your-subdomain.ngrok-free.dev
```

Перезапустите сервер.

#### ⚠️ Важно:
- URL меняется при каждом перезапуске ngrok
- Компьютер должен быть включен
- Бесплатная версия показывает предупреждение (нажмите "Visit Site")

#### 💎 Платная версия ($8-10/мес):
- Постоянный URL
- Нет предупреждения
- Больше туннелей

---

### 2. 💻 VPS (Рекомендуется для продакшена)

#### Подходящие провайдеры:

**Международные:**
- DigitalOcean ($5/мес) - https://digitalocean.com
- Vultr ($5/мес) - https://vultr.com
- Linode ($5/мес) - https://linode.com

**Российские:**
- Timeweb (от 299₽/мес) - https://timeweb.com
- REG.RU (от 350₽/мес) - https://reg.ru

#### Быстрая настройка (Ubuntu 22.04):

```bash
# 1. Обновите систему
sudo apt update && sudo apt upgrade -y

# 2. Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Установите Git
sudo apt install git -y

# 4. Клонируйте репозиторий
git clone https://github.com/Sneckpro/sneksy.git
cd sneksy

# 5. Установите зависимости
npm install

# 6. Создайте .env
cp .env.example .env
nano .env  # Заполните настройки

# 7. Установите PM2
sudo npm install -g pm2

# 8. Запустите приложение
pm2 start server.js --name wallet
pm2 startup
pm2 save

# 9. Настройте Nginx
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/wallet

# Вставьте конфигурацию:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/wallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Получите SSL сертификат (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

#### Обновите .env на сервере:

```env
BASE_URL=https://your-domain.com
```

---

### 3. ☁️ Railway.app (Автоматический деплой)

1. Зарегистрируйтесь: https://railway.app
2. Подключите GitHub репозиторий
3. Railway автоматически:
   - Установит зависимости
   - Запустит приложение
   - Даст публичный URL с HTTPS

#### Настройте переменные окружения в Railway:

```
PORT=3000
GOOGLE_ISSUER_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
BASE_URL=https://your-app.railway.app
```

**⚠️ Важно:** Railway может быть недоступен в РФ (нужен VPN).

---

### 4. 🌊 Render.com (Альтернатива Railway)

1. Зарегистрируйтесь: https://render.com
2. New → Web Service
3. Подключите GitHub репозиторий
4. Настройте:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Добавьте переменные окружения

**⚠️ Важно:** Бесплатный тариф "засыпает" после 15 минут неактивности.

---

## 🔧 После деплоя

### 1. Обновите BASE_URL в .env

```env
BASE_URL=https://your-actual-domain.com
```

### 2. Настройте Syrve вебхук

URL вебхука:
```
https://your-domain.com/api/syrve/webhook
```

Или используйте интерфейс:
```
https://your-domain.com/syrve
```

### 3. Проверьте работу

- Регистрация: `https://your-domain.com/`
- Админка: `https://your-domain.com/admin`
- API: `https://your-domain.com/api/users`

---

## 📊 Сравнение вариантов

| Вариант | Цена | Сложность | HTTPS | Рекомендация |
|---------|------|-----------|-------|--------------|
| ngrok Free | Бесплатно | ⭐ Легко | ✅ Да | Тестирование |
| ngrok Paid | $8-10/мес | ⭐ Легко | ✅ Да | Малый бизнес |
| VPS | $5-10/мес | ⭐⭐⭐ Средне | ✅ Да | **Продакшн** |
| Railway | Free/$5+/мес | ⭐ Легко | ✅ Да | Стартапы |
| Render | Free/$7+/мес | ⭐ Легко | ✅ Да | Стартапы |

---

## 💡 Рекомендации

### Для тестирования:
✅ **ngrok** - быстро, просто, бесплатно

### Для небольшого ресторана:
✅ **VPS** - полный контроль, надёжность

### Для стартапа:
✅ **Railway/Render** - автоматизация, масштабирование

---

## 🆘 Поддержка

При проблемах:
1. Проверьте логи сервера
2. Убедитесь что BASE_URL правильный
3. Проверьте доступность порта 3000
4. Проверьте настройки файрвола

---

## 📚 Дополнительные ресурсы

- **ngrok документация**: https://ngrok.com/docs
- **PM2 документация**: https://pm2.keymetrics.io/
- **Nginx конфигурация**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
