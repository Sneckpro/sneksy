#!/bin/bash

echo "🧪 Тестирование Restaurant Wallet API"
echo "====================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проверка, что сервер запущен
echo "Проверяем, что сервер запущен на localhost:3000..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Сервер не запущен!"
    echo "Запустите сервер командой: npm start"
    exit 1
fi

echo -e "${GREEN}✅ Сервер работает!${NC}"
echo ""

# 1. Регистрация тестового пользователя
echo -e "${BLUE}1. Регистрация тестового пользователя...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Иван",
    "last_name": "Петров",
    "email": "ivan.test@example.com",
    "phone": "+7 999 123 45 67"
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Извлекаем user_id из ответа
USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "⚠️  Пользователь уже существует или ошибка регистрации"
    echo "Попробуем найти существующего пользователя..."
    # Получаем список пользователей и берем первого
    USERS=$(curl -s http://localhost:3000/api/users)
    USER_ID=$(echo "$USERS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Используем user_id: $USER_ID"
else
    echo -e "${GREEN}✅ Пользователь создан!${NC}"
    echo "User ID: $USER_ID"
fi

echo ""
echo "⏱️  Ждем 2 секунды..."
sleep 2

# 2. Добавление транзакции на 30,000₽ (скидка остается 3%)
echo -e "${BLUE}2. Добавление покупки на 30,000₽ (скидка 3%)...${NC}"
curl -s -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"amount\": 30000,
    \"description\": \"Тестовая покупка №1\"
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "⏱️  Ждем 2 секунды..."
sleep 2

# 3. Добавление транзакции на 20,000₽ (скидка повысится до 5%)
echo -e "${BLUE}3. Добавление покупки на 20,000₽ (скидка повысится до 5%)...${NC}"
curl -s -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"amount\": 20000,
    \"description\": \"Тестовая покупка №2 - переход на 5%\"
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "⏱️  Ждем 2 секунды..."
sleep 2

# 4. Добавление транзакции на 60,000₽ (скидка повысится до 10%)
echo -e "${BLUE}4. Добавление покупки на 60,000₽ (скидка повысится до 10%)...${NC}"
curl -s -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"amount\": 60000,
    \"description\": \"Тестовая покупка №3 - переход на 10%\"
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "⏱️  Ждем 2 секунды..."
sleep 2

# 5. Добавление транзакции на 100,000₽ (скидка повысится до 15%)
echo -e "${BLUE}5. Добавление покупки на 100,000₽ (скидка повысится до 15%)...${NC}"
curl -s -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"amount\": 100000,
    \"description\": \"Тестовая покупка №4 - переход на 15%\"
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "⏱️  Ждем 2 секунды..."
sleep 2

# 6. Получение информации о пользователе
echo -e "${BLUE}6. Финальное состояние пользователя:${NC}"
curl -s http://localhost:3000/api/user/$USER_ID | python3 -m json.tool 2>/dev/null

echo ""
echo ""

# 7. Получение истории транзакций
echo -e "${BLUE}7. История транзакций:${NC}"
curl -s http://localhost:3000/api/transactions/$USER_ID | python3 -m json.tool 2>/dev/null

echo ""
echo ""
echo -e "${GREEN}✅ Тестирование завершено!${NC}"
echo ""
echo "Откройте админ-панель для просмотра: http://localhost:3000/admin"
