const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Инициализация Google Wallet API
let credentials = null;

function initializeGoogleWallet() {
  try {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (fs.existsSync(keyPath)) {
      credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading Google credentials:', error);
  }
}

// Создание класса карты (нужно создать только один раз)
async function createLoyaltyClass() {
  if (!credentials) {
    throw new Error('Google credentials not configured');
  }

  const classId = `${process.env.GOOGLE_ISSUER_ID}.loyalty_class`;

  const loyaltyClass = {
    id: classId,
    issuerName: process.env.RESTAURANT_NAME || 'Ресторан',
    reviewStatus: 'UNDER_REVIEW',
    programName: 'Программа лояльности',
    programLogo: {
      sourceUri: {
        uri: `${process.env.BASE_URL}/images/logo.png`
      }
    },
    hexBackgroundColor: '#000000',
    localizedIssuerName: {
      defaultValue: {
        language: 'ru',
        value: process.env.RESTAURANT_NAME || 'Ресторан'
      }
    },
    localizedProgramName: {
      defaultValue: {
        language: 'ru',
        value: 'Программа лояльности'
      }
    }
  };

  return classId;
}

// Генерация Google Wallet Pass (JWT)
async function generateGooglePass(userData) {
  try {
    if (!credentials) {
      initializeGoogleWallet();
    }

    if (!credentials) {
      throw new Error('Google credentials not configured');
    }

    const classId = `${process.env.GOOGLE_ISSUER_ID}.loyalty_class`;
    const objectId = `${process.env.GOOGLE_ISSUER_ID}.${userData.pass_serial}`;

    // Создаем объект карты лояльности
    const loyaltyObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      barcode: {
        type: 'QR_CODE',
        value: userData.pass_serial,
        alternateText: userData.pass_serial
      },
      accountId: userData.pass_serial,
      accountName: `${userData.first_name} ${userData.last_name}`,
      loyaltyPoints: {
        label: 'Текущая скидка',
        balance: {
          string: `${userData.discount_percent}%`
        }
      },
      secondaryLoyaltyPoints: {
        label: 'Потрачено',
        balance: {
          string: `${userData.total_spent.toLocaleString('ru-RU')} ₽`
        }
      },
      textModulesData: [
        {
          header: 'Email',
          body: userData.email,
          id: 'email'
        },
        {
          header: 'Телефон',
          body: userData.phone,
          id: 'phone'
        },
        {
          header: 'Следующий уровень',
          body: getNextLevelInfo(userData.total_spent),
          id: 'nextLevel'
        },
        {
          header: 'Условия программы',
          body: 'При регистрации: 3%\nПосле 40,000₽: 5%\nПосле 100,000₽: 10%\nПосле 200,000₽: 15%',
          id: 'terms'
        }
      ]
    };

    // Создаем JWT payload
    const claims = {
      iss: credentials.client_email,
      aud: 'google',
      origins: [process.env.BASE_URL],
      typ: 'savetogooglepay',
      payload: {
        loyaltyObjects: [loyaltyObject]
      }
    };

    // Подписываем JWT
    const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });

    // Генерируем URL для добавления в Google Wallet
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return {
      passUrl: saveUrl,
      token: token,
      objectId: objectId
    };

  } catch (error) {
    console.error('Error generating Google Pass:', error);
    throw error;
  }
}

// Обновление Google Wallet Pass
async function updateGooglePass(userData) {
  try {
    // Google Wallet карты обновляются автоматически через JWT
    // Просто генерируем новый токен с обновленными данными
    return await generateGooglePass(userData);
  } catch (error) {
    console.error('Error updating Google Pass:', error);
    throw error;
  }
}

// Определение информации о следующем уровне
function getNextLevelInfo(totalSpent) {
  if (totalSpent < 40000) {
    const remaining = 40000 - totalSpent;
    return `До 5%: ${remaining.toLocaleString('ru-RU')} ₽`;
  } else if (totalSpent < 100000) {
    const remaining = 100000 - totalSpent;
    return `До 10%: ${remaining.toLocaleString('ru-RU')} ₽`;
  } else if (totalSpent < 200000) {
    const remaining = 200000 - totalSpent;
    return `До 15%: ${remaining.toLocaleString('ru-RU')} ₽`;
  }
  return 'Максимальный уровень достигнут!';
}

module.exports = {
  initializeGoogleWallet,
  createLoyaltyClass,
  generateGooglePass,
  updateGooglePass
};
