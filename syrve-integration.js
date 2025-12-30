const SyrveClient = require('./syrve-client');
const db = require('./database');
const appleWallet = require('./apple-wallet');
const googleWallet = require('./google-wallet');

/**
 * Интеграция с Syrve для автоматической синхронизации клиентов и транзакций
 */
class SyrveIntegration {
  constructor(apiLogin, organizationId) {
    this.client = new SyrveClient(apiLogin);
    this.client.setOrganization(organizationId);
  }

  /**
   * Синхронизация клиента из Syrve в нашу базу данных
   */
  async syncCustomerFromSyrve(syrveCustomerId) {
    try {
      // Получаем информацию о клиенте из Syrve
      const syrveCustomer = await this.client.getCustomerById(syrveCustomerId);

      if (!syrveCustomer || !syrveCustomer.customer) {
        throw new Error('Customer not found in Syrve');
      }

      const customer = syrveCustomer.customer;

      // Проверяем, есть ли клиент в нашей базе (по email)
      let existingUser = null;
      if (customer.email) {
        existingUser = await db.getUserByEmail(customer.email);
      }

      // Если нет, создаем нового
      if (!existingUser) {
        const { v4: uuidv4 } = require('uuid');
        const passSerial = `REST${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const userData = {
          id: uuidv4(),
          email: customer.email || `${customer.phone}@syrve-import.local`,
          phone: customer.phone || '',
          first_name: customer.name?.split(' ')[0] || 'Клиент',
          last_name: customer.name?.split(' ').slice(1).join(' ') || 'Syrve',
          pass_serial: passSerial,
          total_spent: 0,
          discount_percent: 3
        };

        existingUser = await db.createUser(userData);

        // Генерируем passes
        try {
          const applePass = await appleWallet.generateApplePass(existingUser);
          const googlePass = await googleWallet.generateGooglePass(existingUser);
          await db.updateUserPassUrls(existingUser.id, applePass.passUrl, googlePass.passUrl);
        } catch (error) {
          console.error('Error generating passes:', error.message);
        }

        console.log(`✅ New customer synced from Syrve: ${customer.name} (${customer.phone})`);
      } else {
        console.log(`ℹ️ Customer already exists: ${customer.name} (${customer.phone})`);
      }

      return existingUser;
    } catch (error) {
      console.error('Error syncing customer from Syrve:', error.message);
      throw error;
    }
  }

  /**
   * Обработка заказа из Syrve и создание транзакции
   */
  async processOrder(orderId) {
    try {
      // Получаем информацию о заказе из Syrve
      const ordersData = await this.client.getOrdersByIds([orderId]);

      if (!ordersData || !ordersData.orders || ordersData.orders.length === 0) {
        throw new Error('Order not found in Syrve');
      }

      const order = ordersData.orders[0];

      // Получаем информацию о клиенте
      let user = null;

      // Пытаемся найти клиента по телефону
      if (order.customer?.phone) {
        const phone = order.customer.phone.replace(/\D/g, '');
        user = await db.getUserByPhone(phone);
      }

      // Если не нашли, пытаемся найти по email
      if (!user && order.customer?.email) {
        user = await db.getUserByEmail(order.customer.email);
      }

      // Если клиент не найден, синхронизируем из Syrve или создаем нового
      if (!user && order.customer?.id) {
        user = await this.syncCustomerFromSyrve(order.customer.id);
      }

      // Если все еще не нашли клиента, создаем анонимного
      if (!user) {
        const { v4: uuidv4 } = require('uuid');
        const passSerial = `REST${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const userData = {
          id: uuidv4(),
          email: order.customer?.email || `anonymous_${Date.now()}@wallet.local`,
          phone: order.customer?.phone || 'Не указан',
          first_name: order.customer?.name?.split(' ')[0] || 'Клиент',
          last_name: order.customer?.name?.split(' ').slice(1).join(' ') || 'Анонимный',
          pass_serial: passSerial,
          total_spent: 0,
          discount_percent: 3
        };

        user = await db.createUser(userData);
        console.log(`⚠️ Created anonymous customer for order ${orderId}`);
      }

      // Создаем транзакцию
      const orderSum = order.sum || 0;
      const description = `Заказ Syrve #${order.number || orderId}`;

      const transaction = await db.addTransaction(user.id, orderSum, description);

      console.log(`✅ Transaction created: ${orderSum}₽ for ${user.first_name} ${user.last_name}`);

      // Если скидка изменилась, обновляем passes
      if (transaction.discountChanged) {
        const updatedUser = await db.getUserById(user.id);

        try {
          await appleWallet.updateApplePass(updatedUser);
          await googleWallet.updateGooglePass(updatedUser);
          console.log(`🎉 Discount upgraded to ${transaction.newDiscountPercent}% for ${user.first_name}!`);
        } catch (error) {
          console.error('Error updating passes:', error.message);
        }
      }

      return {
        success: true,
        transaction,
        user,
        order
      };

    } catch (error) {
      console.error('Error processing order from Syrve:', error.message);
      throw error;
    }
  }

  /**
   * Обработка вебхука от Syrve
   */
  async handleWebhook(webhookData) {
    try {
      const eventType = webhookData.eventType;
      const orderId = webhookData.orderId;

      console.log(`📥 Received webhook: ${eventType} for order ${orderId}`);

      switch (eventType) {
        case 'DeliveryOrderUpdate':
          // Обрабатываем обновление заказа
          const order = webhookData.order;

          // Проверяем статус заказа
          // Обрабатываем только закрытые/оплаченные заказы
          const processableStatuses = ['Closed', 'Delivered', 'OnWay'];

          if (order && processableStatuses.includes(order.status)) {
            console.log(`✅ Processing order ${orderId} with status: ${order.status}`);
            return await this.processOrder(orderId);
          } else {
            console.log(`ℹ️ Skipping order ${orderId} with status: ${order?.status}`);
            return { success: true, skipped: true, reason: 'Order status not processable' };
          }

        case 'DeliveryOrderError':
          console.error(`❌ Order error for ${orderId}:`, webhookData.errorInfo);
          return { success: false, error: webhookData.errorInfo };

        default:
          console.log(`ℹ️ Unhandled event type: ${eventType}`);
          return { success: true, skipped: true, reason: 'Event type not handled' };
      }

    } catch (error) {
      console.error('Error handling webhook:', error.message);
      throw error;
    }
  }

  /**
   * Экспорт клиента в Syrve
   */
  async exportCustomerToSyrve(userId) {
    try {
      const user = await db.getUserById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Создаем или обновляем клиента в Syrve
      const customerData = {
        phone: user.phone.replace(/\D/g, ''),
        name: `${user.first_name} ${user.last_name}`,
        email: user.email
      };

      const result = await this.client.createOrUpdateCustomer(customerData);

      console.log(`✅ Customer exported to Syrve: ${user.first_name} ${user.last_name}`);

      return result;

    } catch (error) {
      console.error('Error exporting customer to Syrve:', error.message);
      throw error;
    }
  }

  /**
   * Применение скидки в Syrve на основе нашей системы лояльности
   */
  async applyDiscountInSyrve(orderId, userId) {
    try {
      const user = await db.getUserById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Здесь можно реализовать логику применения скидки через API Syrve
      // Например, рассчитать скидку и передать в Syrve

      console.log(`Applying ${user.discount_percent}% discount for order ${orderId}`);

      // TODO: Реализовать через Syrve API
      // const result = await this.client.calculateLoyalty(orderId, syrveCustomerId, orderSum);

      return {
        discount_percent: user.discount_percent,
        user: user
      };

    } catch (error) {
      console.error('Error applying discount in Syrve:', error.message);
      throw error;
    }
  }

  /**
   * Настройка вебхука в Syrve
   */
  async setupWebhook(webhookUrl) {
    try {
      const result = await this.client.setWebhook(webhookUrl, [
        'DeliveryOrderUpdate',
        'DeliveryOrderError'
      ]);

      console.log(`✅ Webhook configured: ${webhookUrl}`);

      return result;
    } catch (error) {
      console.error('Error setting up webhook:', error.message);
      throw error;
    }
  }

  /**
   * Получение настроек вебхука
   */
  async getWebhookSettings() {
    try {
      return await this.client.getWebhookSettings();
    } catch (error) {
      console.error('Error getting webhook settings:', error.message);
      throw error;
    }
  }
}

module.exports = SyrveIntegration;
