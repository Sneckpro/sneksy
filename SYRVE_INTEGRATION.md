# 🔗 Интеграция с Syrve (iiko)

Полное руководство по интеграции системы лояльности с кассовым приложением Syrve.

## Что дает интеграция

✅ **Автоматическая синхронизация**: Заказы из Syrve автоматически создают транзакции в системе лояльности
✅ **Синхронизация клиентов**: Клиенты из Syrve импортируются автоматически
✅ **Автоматическое применение скидок**: Скидки рассчитываются и применяются при каждой покупке
✅ **Обновление карт**: Карты в Apple/Google Wallet обновляются при изменении скидки
✅ **Реал-тайм уведомления**: Через вебхуки Syrve

---

## Требования

1. **Аккаунт Syrve** с активной подпиской
2. **API Login** от Syrve (запросите в поддержке)
3. **Organization ID** вашей организации
4. **Публичный URL** для вебхука (домен с HTTPS или ngrok для тестирования)

---

## Быстрая настройка

### Шаг 1: Получение API Login

1. Войдите в [Syrve Office](https://office.syrve.ru/)
2. Перейдите в **Настройки → API**
3. Запросите API Login (если нет - обратитесь в поддержку Syrve)
4. Скопируйте ваш API Login

### Шаг 2: Получение Organization ID

1. В Syrve Office перейдите в **Настройки → Организация**
2. Скопируйте Organization ID (длинный UUID)

Или используйте API:

```bash
curl -X POST https://api-ru.iiko.services/api/1/access_token \
  -H "Content-Type: application/json" \
  -d '{"apiLogin": "ваш_api_login"}'

# Получите токен, затем:
curl -X POST https://api-ru.iiko.services/api/1/organizations \
  -H "Authorization: Bearer ваш_токен"
```

### Шаг 3: Настройка в .env

Откройте файл `.env` и добавьте:

```env
SYRVE_API_LOGIN=ваш_api_login_здесь
SYRVE_ORGANIZATION_ID=ваш_organization_id_здесь
BASE_URL=https://your-domain.com
```

**Важно**: Для вебхуков нужен публичный HTTPS URL. Для тестирования используйте [ngrok](https://ngrok.com/).

### Шаг 4: Перезапустите сервер

```bash
npm start
```

Вы должны увидеть:
```
✅ Syrve Integration initialized
```

---

## Настройка вебхука

### Автоматическая настройка (рекомендуется)

1. Откройте http://localhost:3000/syrve (или ваш домен/syrve)
2. Нажмите кнопку **"Настроить вебхук автоматически"**
3. Готово!

### Ручная настройка

1. Войдите в [Syrve Office](https://office.syrve.ru/)
2. Перейдите в **Настройки → API → Вебхуки**
3. Добавьте URL: `https://your-domain.com/api/syrve/webhook`
4. Выберите типы событий:
   - ✅ DeliveryOrderUpdate
   - ✅ DeliveryOrderError
5. Сохраните

---

## Как работает интеграция

### Поток данных при заказе:

```
1. Клиент делает заказ в Syrve
         ↓
2. Syrve отправляет вебхук на /api/syrve/webhook
         ↓
3. Система находит клиента по телефону/email
         ↓
4. Если клиент не найден - создается новый
         ↓
5. Создается транзакция с суммой заказа
         ↓
6. Рассчитывается и применяется скидка
         ↓
7. Если достигнут новый уровень - обновляется карта в телефоне
         ↓
8. Клиент получает уведомление о новой скидке
```

### Обрабатываемые события

#### DeliveryOrderUpdate
Обрабатывается при статусах:
- ✅ **Closed** - заказ закрыт
- ✅ **Delivered** - заказ доставлен
- ✅ **OnWay** - заказ в пути

Не обрабатываются:
- ❌ New, InProgress, Cancelled, etc.

#### DeliveryOrderError
Логируется в консоль для отладки.

---

## API Endpoints

### Вебхук от Syrve

```http
POST /api/syrve/webhook
Content-Type: application/json

{
  "eventType": "DeliveryOrderUpdate",
  "orderId": "uuid-заказа",
  "order": { ... }
}
```

**Ответ**: `200 OK` (всегда, даже при ошибках внутренней обработки)

---

### Настройка вебхука

```http
POST /api/syrve/setup-webhook
```

**Ответ**:
```json
{
  "success": true,
  "message": "Webhook настроен успешно",
  "webhookUrl": "https://your-domain.com/api/syrve/webhook"
}
```

---

### Получение настроек вебхука

```http
GET /api/syrve/webhook-settings
```

**Ответ**:
```json
{
  "organizationIds": ["uuid"],
  "webHooksUri": "https://your-domain.com/api/syrve/webhook",
  "webHooksEventTypes": ["DeliveryOrderUpdate", "DeliveryOrderError"]
}
```

---

### Ручная синхронизация клиента

```http
POST /api/syrve/sync-customer/:syrveCustomerId
```

**Ответ**:
```json
{
  "success": true,
  "message": "Клиент синхронизирован из Syrve",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "first_name": "Иван",
    "discount_percent": 3
  }
}
```

---

### Ручная обработка заказа

```http
POST /api/syrve/process-order/:orderId
```

**Ответ**:
```json
{
  "success": true,
  "message": "Заказ обработан успешно",
  "result": {
    "transaction": { ... },
    "user": { ... },
    "order": { ... }
  }
}
```

---

### Экспорт клиента в Syrve

```http
POST /api/syrve/export-customer/:userId
```

Экспортирует клиента из вашей системы в Syrve.

---

## Тестирование интеграции

### 1. Проверка настройки вебхука

Откройте http://localhost:3000/syrve и нажмите **"Проверить настройки"**.

### 2. Тестирование через реальный заказ

1. Создайте тестовый заказ в Syrve
2. Закройте заказ
3. Проверьте логи сервера:

```
📥 Syrve webhook received: DeliveryOrderUpdate for order uuid-заказа
✅ Transaction created: 5000₽ for Иван Петров
🎉 Discount upgraded to 5% for Иван!
```

4. Проверьте админ-панель: http://localhost:3000/admin

### 3. Ручное тестирование

```bash
# Обработка заказа
curl -X POST http://localhost:3000/api/syrve/process-order/uuid-заказа

# Синхронизация клиента
curl -X POST http://localhost:3000/api/syrve/sync-customer/uuid-клиента
```

---

## Использование с ngrok (для тестирования)

Если у вас еще нет публичного домена:

### 1. Установите ngrok

```bash
# macOS
brew install ngrok

# Или скачайте с https://ngrok.com/download
```

### 2. Запустите ngrok

```bash
ngrok http 3000
```

### 3. Используйте URL от ngrok

```
Forwarding: https://abcd-1234.ngrok.io -> http://localhost:3000
```

### 4. Обновите .env

```env
BASE_URL=https://abcd-1234.ngrok.io
```

### 5. Перезапустите сервер

```bash
npm start
```

### 6. Настройте вебхук в Syrve

URL вебхука: `https://abcd-1234.ngrok.io/api/syrve/webhook`

---

## Архитектура

### Модули интеграции

#### `syrve-client.js`
Низкоуровневый клиент для работы с Syrve API:
- Аутентификация (auto-refresh токенов)
- Customer Management API
- Loyalty Programs API
- Orders API
- Webhooks API

#### `syrve-integration.js`
Бизнес-логика интеграции:
- Синхронизация клиентов
- Обработка заказов
- Обработка вебхуков
- Создание транзакций
- Обновление карт лояльности

#### `server.js` (Syrve endpoints)
REST API endpoints для взаимодействия с Syrve:
- `/api/syrve/webhook` - прием вебхуков
- `/api/syrve/setup-webhook` - настройка
- `/api/syrve/process-order/:id` - ручная обработка
- `/api/syrve/sync-customer/:id` - ручная синхронизация

---

## Поиск клиентов

Система ищет клиентов в следующем порядке:

1. **По телефону** из заказа
2. **По email** из заказа
3. **По Syrve Customer ID** (синхронизация)
4. **Создание нового** клиента

---

## Обработка ошибок

### Клиент не найден

Создается новый клиент с:
- Email: из заказа или `anonymous_timestamp@wallet.local`
- Телефон: из заказа или "Не указан"
- Имя: из заказа или "Клиент Анонимный"
- Начальная скидка: 3%

### Ошибка создания транзакции

- Логируется в консоль
- Вебхук отвечает success (чтобы Syrve не повторял)
- Можно обработать вручную позже

### Ошибка обновления карты

- Логируется в консоль
- Транзакция все равно создается
- Карта обновится при следующей транзакции

---

## Безопасность

### Валидация вебхуков

**Текущая реализация**: Базовая (любой может отправить POST)

**Рекомендации для продакшена**:

1. **IP Whitelist**: Разрешите только IP Syrve
2. **Секретный токен**: Добавьте в URL или Header
3. **Подпись запросов**: HMAC validation

Пример с секретным токеном:

```javascript
app.post('/api/syrve/webhook', async (req, res) => {
  const token = req.headers['x-syrve-token'];

  if (token !== process.env.SYRVE_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Обработка вебхука...
});
```

---

## Мониторинг

### Логи

Все события логируются в консоль:

```
📥 Syrve webhook received: DeliveryOrderUpdate for order uuid
✅ Transaction created: 5000₽ for Иван Петров
🎉 Discount upgraded to 5% for Иван!
❌ Error processing webhook: ...
```

### Рекомендуемые инструменты

- **PM2**: Process manager с логами
- **Winston**: Structured logging
- **Sentry**: Error tracking
- **Prometheus**: Metrics

---

## FAQ

### Q: Нужно ли настраивать что-то в Syrve, кроме вебхука?

A: Нет, достаточно API Login, Organization ID и настроенного вебхука.

### Q: Можно ли использовать без вебхука?

A: Да, можно вручную обрабатывать заказы через `/api/syrve/process-order/:id`.

### Q: Как обрабатываются дубликаты вебхуков?

A: Если транзакция уже создана, просто игнорируется. Можно добавить дополнительную логику проверки.

### Q: Поддерживается ли несколько организаций?

A: Текущая реализация - одна организация. Для нескольких нужно расширить код.

### Q: Что делать если вебхуки не приходят?

A: Проверьте:
1. URL доступен извне (curl https://your-domain.com/api/syrve/webhook)
2. HTTPS настроен правильно
3. Настройки вебхука в Syrve Office
4. Логи сервера

---

## Полезные ссылки

- **Syrve Office**: https://office.syrve.ru/
- **API Документация**: https://api-ru.iiko.services/docs
- **GitHub (Python SDK)**: https://github.com/kebrick/pyiikocloudapi
- **Техподдержка Syrve**: support@syrve.ru

---

## Развитие

### Планируемые улучшения

- [ ] Двусторонняя синхронизация скидок с Syrve Loyalty
- [ ] Применение скидок напрямую в заказе Syrve
- [ ] Поддержка бонусных баллов Syrve
- [ ] Webhook retry mechanism
- [ ] Подпись и валидация вебхуков
- [ ] Dashboard с метриками интеграции

---

## Поддержка

При проблемах:

1. Проверьте логи: `npm start` (смотрите консоль)
2. Проверьте настройки: http://localhost:3000/syrve
3. Проверьте .env файл
4. Проверьте доступность API Syrve

---

**Интеграция готова к использованию!** 🎉

Sources:
- [Syrve POS API Documentation](https://syrve.github.io/front.api.doc/)
- [Syrve Help Center](https://en.syrve.help/articles/api/getting-started-api)
- [iikoTransport API](https://api-ru.iiko.services/)
- [PyIikoCloudAPI GitHub](https://github.com/kebrick/pyiikocloudapi)
