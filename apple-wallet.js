const { PKPass } = require('passkit-generator');
const fs = require('fs');
const path = require('path');

// Генерация Apple Wallet Pass
async function generateApplePass(userData) {
  try {
    const passesDir = path.join(__dirname, 'passes');
    const modelDir = path.join(__dirname, 'apple-pass-model');

    // Создаем директории если не существуют
    if (!fs.existsSync(passesDir)) {
      fs.mkdirSync(passesDir, { recursive: true });
    }

    // Данные для pass
    const passData = {
      // Основная информация
      serialNumber: userData.pass_serial,
      description: process.env.RESTAURANT_DESCRIPTION || 'Программа лояльности',
      organizationName: process.env.RESTAURANT_NAME || 'Ресторан',

      // Визуальные поля
      storeCard: {
        primaryFields: [
          {
            key: 'balance',
            label: 'Скидка',
            value: `${userData.discount_percent}%`
          }
        ],
        secondaryFields: [
          {
            key: 'name',
            label: 'Владелец',
            value: `${userData.first_name} ${userData.last_name}`
          }
        ],
        auxiliaryFields: [
          {
            key: 'totalSpent',
            label: 'Потрачено',
            value: `${userData.total_spent.toLocaleString('ru-RU')} ₽`,
            textAlignment: 'PKTextAlignmentRight'
          }
        ],
        backFields: [
          {
            key: 'email',
            label: 'Email',
            value: userData.email
          },
          {
            key: 'phone',
            label: 'Телефон',
            value: userData.phone
          },
          {
            key: 'cardNumber',
            label: 'Номер карты',
            value: userData.pass_serial
          },
          {
            key: 'nextLevel',
            label: 'Следующий уровень',
            value: getNextLevelInfo(userData.total_spent)
          },
          {
            key: 'terms',
            label: 'Условия программы',
            value: 'При регистрации: 3%\nПосле 40,000₽: 5%\nПосле 100,000₽: 10%\nПосле 200,000₽: 15%'
          }
        ]
      },

      // Штрихкод
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: userData.pass_serial,
          messageEncoding: 'iso-8859-1'
        }
      ],

      // Цвета
      backgroundColor: 'rgb(0, 0, 0)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(150, 150, 150)',

      // URL для обновлений
      webServiceURL: process.env.BASE_URL,
      authenticationToken: userData.id
    };

    // Создаем pass
    const pass = await PKPass.from(
      {
        model: modelDir,
        certificates: {
          wwdr: process.env.APPLE_WWDR_CERTIFICATE_PATH,
          signerCert: process.env.APPLE_SIGNER_CERTIFICATE_PATH,
          signerKey: {
            keyFile: process.env.APPLE_SIGNER_KEY_PATH,
            passphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE
          }
        }
      },
      passData
    );

    // Сохраняем pass
    const passBuffer = pass.getAsBuffer();
    const passFileName = `${userData.pass_serial}.pkpass`;
    const passFilePath = path.join(passesDir, passFileName);

    fs.writeFileSync(passFilePath, passBuffer);

    return {
      passUrl: `${process.env.BASE_URL}/passes/${passFileName}`,
      passPath: passFilePath
    };

  } catch (error) {
    console.error('Error generating Apple Pass:', error);
    throw error;
  }
}

// Обновление существующего pass
async function updateApplePass(userData) {
  try {
    return await generateApplePass(userData);
  } catch (error) {
    console.error('Error updating Apple Pass:', error);
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
  generateApplePass,
  updateApplePass
};
