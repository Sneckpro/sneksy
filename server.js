require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const db = require('./database');
const appleWallet = require('./apple-wallet');
const googleWallet = require('./google-wallet');
const SyrveIntegration = require('./syrve-integration');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/passes', express.static('passes'));

// Инициализация Google Wallet
googleWallet.initializeGoogleWallet();

// Инициализация Syrve Integration (если настроено)
let syrveIntegration = null;
if (process.env.SYRVE_API_LOGIN && process.env.SYRVE_ORGANIZATION_ID) {
  syrveIntegration = new SyrveIntegration(
    process.env.SYRVE_API_LOGIN,
    process.env.SYRVE_ORGANIZATION_ID
  );
  console.log('✅ Syrve Integration initialized');
} else {
  console.log('⚠️  Syrve Integration not configured (add SYRVE_API_LOGIN and SYRVE_ORGANIZATION_ID to .env)');
}

// Главная страница - форма регистрации
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Регистрация нового пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { email, phone, first_name, last_name } = req.body;

    // Валидация
    if (!email || !phone || !first_name || !last_name) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // Проверяем, не существует ли пользователь
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    // Создаем нового пользователя
    const userId = uuidv4();
    const passSerial = `REST${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const userData = {
      id: userId,
      email,
      phone,
      first_name,
      last_name,
      pass_serial: passSerial,
      total_spent: 0,
      discount_percent: 3
    };

    await db.createUser(userData);

    // Генерируем passes для Apple Wallet и Google Wallet
    let applePassUrl = null;
    let googlePassUrl = null;

    try {
      const applePass = await appleWallet.generateApplePass(userData);
      applePassUrl = applePass.passUrl;
    } catch (error) {
      console.error('Error generating Apple Pass:', error.message);
    }

    try {
      const googlePass = await googleWallet.generateGooglePass(userData);
      googlePassUrl = googlePass.passUrl;
    } catch (error) {
      console.error('Error generating Google Pass:', error.message);
    }

    // Обновляем URLs в базе данных
    await db.updateUserPassUrls(userId, applePassUrl, googlePassUrl);

    res.json({
      success: true,
      message: 'Регистрация успешна!',
      user: {
        id: userId,
        email,
        first_name,
        last_name,
        discount_percent: 3,
        pass_serial: passSerial,
        apple_pass_url: applePassUrl,
        google_pass_url: googlePassUrl
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Получение информации о пользователе
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
});

// Получение пользователя по номеру карты (для сканера QR)
app.get('/api/user/card/:serial', async (req, res) => {
  try {
    const user = await db.getUserByPassSerial(req.params.serial);
    if (!user) {
      return res.status(404).json({ error: 'Карта не найдена' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by card:', error);
    res.status(500).json({ error: 'Ошибка при получении данных карты' });
  }
});

// Добавление транзакции (покупка)
app.post('/api/transaction', async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount) {
      return res.status(400).json({ error: 'user_id и amount обязательны' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Сумма должна быть больше нуля' });
    }

    const result = await db.addTransaction(user_id, parseFloat(amount), description);

    // Если скидка изменилась, обновляем passes
    if (result.discountChanged) {
      const user = await db.getUserById(user_id);

      try {
        await appleWallet.updateApplePass(user);
      } catch (error) {
        console.error('Error updating Apple Pass:', error.message);
      }

      try {
        await googleWallet.updateGooglePass(user);
      } catch (error) {
        console.error('Error updating Google Pass:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Транзакция успешно добавлена',
      transaction: result
    });

  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Ошибка при добавлении транзакции' });
  }
});

// Получение транзакций пользователя
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const transactions = await db.getUserTransactions(req.params.userId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Ошибка при получении транзакций' });
  }
});

// Получение всех пользователей (для админ-панели)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
  }
});

// Админ-панель
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Генерация QR кода для регистрации
app.get('/api/qr/registration', async (req, res) => {
  try {
    const registrationUrl = `${process.env.BASE_URL}/`;
    const qrCode = await QRCode.toDataURL(registrationUrl);
    res.json({ qrCode, url: registrationUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Ошибка при генерации QR кода' });
  }
});

// ==========================================
// SYRVE INTEGRATION ENDPOINTS
// ==========================================

// Вебхук для получения уведомлений от Syrve о заказах
app.post('/api/syrve/webhook', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const webhookData = req.body;

    console.log('📥 Syrve webhook received:', {
      eventType: webhookData.eventType,
      orderId: webhookData.orderId,
      timestamp: new Date().toISOString()
    });

    // Обрабатываем вебхук асинхронно
    syrveIntegration.handleWebhook(webhookData)
      .then(result => {
        console.log('✅ Webhook processed successfully:', result);
      })
      .catch(error => {
        console.error('❌ Error processing webhook:', error);
      });

    // Сразу отвечаем Syrve что вебхук получен
    res.json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Все равно отвечаем успехом, чтобы Syrve не повторял отправку
    res.json({ success: true, error: error.message });
  }
});

// Настройка вебхука в Syrve
app.post('/api/syrve/setup-webhook', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const webhookUrl = `${process.env.BASE_URL}/api/syrve/webhook`;
    const result = await syrveIntegration.setupWebhook(webhookUrl);

    res.json({
      success: true,
      message: 'Webhook настроен успешно',
      webhookUrl: webhookUrl,
      result: result
    });

  } catch (error) {
    console.error('Setup webhook error:', error);
    res.status(500).json({ error: 'Ошибка при настройке вебхука', details: error.message });
  }
});

// Получение настроек вебхука
app.get('/api/syrve/webhook-settings', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const settings = await syrveIntegration.getWebhookSettings();
    res.json(settings);

  } catch (error) {
    console.error('Get webhook settings error:', error);
    res.status(500).json({ error: 'Ошибка при получении настроек вебхука' });
  }
});

// Ручная синхронизация клиента из Syrve
app.post('/api/syrve/sync-customer/:syrveCustomerId', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const user = await syrveIntegration.syncCustomerFromSyrve(req.params.syrveCustomerId);

    res.json({
      success: true,
      message: 'Клиент синхронизирован из Syrve',
      user: user
    });

  } catch (error) {
    console.error('Sync customer error:', error);
    res.status(500).json({ error: 'Ошибка при синхронизации клиента', details: error.message });
  }
});

// Ручная обработка заказа из Syrve
app.post('/api/syrve/process-order/:orderId', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const result = await syrveIntegration.processOrder(req.params.orderId);

    res.json({
      success: true,
      message: 'Заказ обработан успешно',
      result: result
    });

  } catch (error) {
    console.error('Process order error:', error);
    res.status(500).json({ error: 'Ошибка при обработке заказа', details: error.message });
  }
});

// Экспорт клиента в Syrve
app.post('/api/syrve/export-customer/:userId', async (req, res) => {
  try {
    if (!syrveIntegration) {
      return res.status(503).json({ error: 'Syrve Integration not configured' });
    }

    const result = await syrveIntegration.exportCustomerToSyrve(req.params.userId);

    res.json({
      success: true,
      message: 'Клиент экспортирован в Syrve',
      result: result
    });

  } catch (error) {
    console.error('Export customer error:', error);
    res.status(500).json({ error: 'Ошибка при экспорте клиента', details: error.message });
  }
});

// Страница настройки Syrve интеграции
app.get('/syrve', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'syrve-setup.html'));
});

// ==========================================
// END SYRVE INTEGRATION
// ==========================================

// Инициализация при запуске
async function initialize() {
  try {
    // Проверяем конфигурацию Google Wallet
    console.log('✅ Google Wallet configured with Issuer ID:', process.env.GOOGLE_ISSUER_ID);
    console.log('ℹ️  Loyalty Class ID:', `${process.env.GOOGLE_ISSUER_ID}.apex_laaa`);
  } catch (error) {
    console.error('⚠️  Ошибка при инициализации:', error.message);
  }
}

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   Restaurant Wallet System                     ║
║   Сервер запущен на порту ${PORT}                ║
║                                                ║
║   Регистрация: http://localhost:${PORT}/       ║
║   Админ-панель: http://localhost:${PORT}/admin ║
╚════════════════════════════════════════════════╝
  `);

  // Инициализация компонентов
  await initialize();
});

module.exports = app;
