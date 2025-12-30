const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
db.serialize(() => {
  // Таблица пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      total_spent REAL DEFAULT 0,
      discount_percent INTEGER DEFAULT 3,
      pass_serial TEXT UNIQUE,
      apple_pass_url TEXT,
      google_pass_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица транзакций
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      discount_applied REAL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Индексы для быстрого поиска
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);
});

// Функция для расчета скидки на основе потраченной суммы
function calculateDiscount(totalSpent) {
  if (totalSpent >= 200000) return 15;
  if (totalSpent >= 100000) return 10;
  if (totalSpent >= 40000) return 5;
  return 3;
}

// Создание пользователя
function createUser(userData) {
  return new Promise((resolve, reject) => {
    const { id, email, phone, first_name, last_name, pass_serial } = userData;
    const sql = `
      INSERT INTO users (id, email, phone, first_name, last_name, pass_serial)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [id, email, phone, first_name, last_name, pass_serial], function(err) {
      if (err) reject(err);
      else resolve({ id, ...userData });
    });
  });
}

// Получение пользователя по ID
function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Получение пользователя по email
function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Получение пользователя по номеру карты
function getUserByPassSerial(passSerial) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE pass_serial = ?', [passSerial], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Получение пользователя по телефону
function getUserByPhone(phone) {
  return new Promise((resolve, reject) => {
    // Убираем все нечисловые символы для поиска
    const cleanPhone = phone.replace(/\D/g, '');
    db.get('SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "(", ""), ")", "") LIKE ?', [`%${cleanPhone}%`], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Обновление URL-ов passes
function updateUserPassUrls(userId, applePassUrl, googlePassUrl) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE users
      SET apple_pass_url = ?, google_pass_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(sql, [applePassUrl, googlePassUrl, userId], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

// Добавление транзакции
function addTransaction(userId, amount, description = '') {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Получаем текущего пользователя
        const user = await getUserById(userId);
        if (!user) {
          return reject(new Error('User not found'));
        }

        // Рассчитываем скидку
        const discountPercent = user.discount_percent;
        const discountAmount = amount * (discountPercent / 100);
        const finalAmount = amount - discountAmount;

        // Обновляем общую сумму потраченных средств
        const newTotalSpent = user.total_spent + finalAmount;
        const newDiscountPercent = calculateDiscount(newTotalSpent);

        // Создаем транзакцию
        const transactionId = require('uuid').v4();
        const sql = `
          INSERT INTO transactions (id, user_id, amount, discount_applied, description)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.run(sql, [transactionId, userId, finalAmount, discountAmount, description], function(err) {
          if (err) {
            reject(err);
          } else {
            // Обновляем пользователя
            const updateSql = `
              UPDATE users
              SET total_spent = ?, discount_percent = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            db.run(updateSql, [newTotalSpent, newDiscountPercent, userId], function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({
                  transactionId,
                  userId,
                  amount: finalAmount,
                  discountApplied: discountAmount,
                  discountPercent,
                  newTotalSpent,
                  newDiscountPercent,
                  discountChanged: newDiscountPercent !== discountPercent
                });
              }
            });
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Получение всех транзакций пользователя
function getUserTransactions(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Получение всех пользователей
function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPassSerial,
  getUserByPhone,
  updateUserPassUrls,
  addTransaction,
  getUserTransactions,
  getAllUsers,
  calculateDiscount
};
