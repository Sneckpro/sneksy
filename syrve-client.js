const axios = require('axios');

/**
 * Клиент для работы с Syrve/iiko API (iikoTransport API)
 * Документация: https://api-ru.iiko.services/docs
 */
class SyrveClient {
  constructor(apiLogin, baseUrl = 'https://api-ru.iiko.services') {
    this.apiLogin = apiLogin;
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.organizationId = null;
  }

  /**
   * Получение access token
   */
  async getAccessToken() {
    try {
      // Если токен еще действителен, используем его
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.baseUrl}/api/1/access_token`, {
        apiLogin: this.apiLogin
      });

      this.accessToken = response.data.token;
      // Токен действителен ~60 минут, сохраняем время истечения
      this.tokenExpiresAt = Date.now() + 55 * 60 * 1000; // 55 минут для безопасности

      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Выполнение запроса к API с автоматической аутентификацией
   */
  async request(method, endpoint, data = null) {
    try {
      const token = await this.getAccessToken();

      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Error ${method} ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Получение списка организаций
   */
  async getOrganizations() {
    return await this.request('POST', '/api/1/organizations');
  }

  /**
   * Установка организации для работы
   */
  setOrganization(organizationId) {
    this.organizationId = organizationId;
  }

  /**
   * CUSTOMER MANAGEMENT
   */

  /**
   * Получение информации о клиенте по телефону
   */
  async getCustomerByPhone(phone) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/customer/info', {
      organizationId: this.organizationId,
      type: 'phone',
      phone: phone.replace(/\D/g, '') // Убираем все нечисловые символы
    });
  }

  /**
   * Получение информации о клиенте по email
   */
  async getCustomerByEmail(email) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/customer/info', {
      organizationId: this.organizationId,
      type: 'email',
      email: email
    });
  }

  /**
   * Получение информации о клиенте по ID
   */
  async getCustomerById(customerId) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/customer/info', {
      organizationId: this.organizationId,
      type: 'id',
      id: customerId
    });
  }

  /**
   * Создание или обновление клиента
   */
  async createOrUpdateCustomer(customerData) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/customer/create_or_update', {
      organizationId: this.organizationId,
      ...customerData
    });
  }

  /**
   * LOYALTY PROGRAM
   */

  /**
   * Получение всех программ лояльности организации
   */
  async getLoyaltyPrograms() {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/programs', {
      organizationIds: [this.organizationId]
    });
  }

  /**
   * Расчет скидок для заказа
   */
  async calculateLoyalty(orderId, customerId, orderSum) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/calculate', {
      organizationId: this.organizationId,
      orderId: orderId,
      customerId: customerId,
      orderSum: orderSum
    });
  }

  /**
   * Начисление бонусов на счет клиента
   */
  async refillCustomerBalance(customerId, sum, comment = '') {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/loyalty/iiko/customer/wallet/refill', {
      organizationId: this.organizationId,
      customerId: customerId,
      sum: sum,
      comment: comment
    });
  }

  /**
   * ORDER MANAGEMENT
   */

  /**
   * Получение заказов по ID
   */
  async getOrdersByIds(orderIds) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/deliveries/by_id', {
      organizationIds: [this.organizationId],
      orderIds: orderIds
    });
  }

  /**
   * Получение заказов по статусам и датам
   */
  async getOrdersByStatus(statuses, dateFrom, dateTo) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/deliveries/by_delivery_date_and_status', {
      organizationIds: [this.organizationId],
      statuses: statuses,
      dateFrom: dateFrom,
      dateTo: dateTo
    });
  }

  /**
   * WEBHOOKS
   */

  /**
   * Настройка вебхука для уведомлений о заказах
   */
  async setWebhook(webhookUrl, eventTypes = ['DeliveryOrderUpdate']) {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/webhooks/update_settings', {
      organizationIds: [this.organizationId],
      webHooksUri: webhookUrl,
      webHooksEventTypes: eventTypes
    });
  }

  /**
   * Получение настроек вебхука
   */
  async getWebhookSettings() {
    if (!this.organizationId) {
      throw new Error('Organization ID not set. Call setOrganization() first.');
    }

    return await this.request('POST', '/api/1/webhooks/settings', {
      organizationIds: [this.organizationId]
    });
  }
}

module.exports = SyrveClient;
