/**
 * Sistema de Notificações Independente
 * Resolve dependência circular entre script.js e dataManager.js
 * @author Sistema de Debug Especializado
 * @version 1.0.0
 */

class NotificationSystem {
  constructor() {
    this.listeners = new Map();
    this.initialized = false;
  }

  /**
   * Inicializa o sistema de notificações
   * @param {Function} notificationHandler - Função que implementa a exibição da notificação
   */
  initialize(notificationHandler) {
    if (typeof notificationHandler !== 'function') {
      console.warn('NotificationSystem: Handler deve ser uma função');
      return;
    }
    
    this.notificationHandler = notificationHandler;
    this.initialized = true;
    
    // Processa notificações pendentes
    this.processPendingNotifications();
  }

  /**
   * Envia uma notificação
   * @param {string} message - Mensagem da notificação
   * @param {string} type - Tipo da notificação (success, error, info, warning)
   */
  show(message, type = 'info') {
    if (!message) {
      console.warn('NotificationSystem: Mensagem é obrigatória');
      return;
    }

    const notification = { message, type, timestamp: Date.now() };

    if (this.initialized && this.notificationHandler) {
      try {
        this.notificationHandler(message, type);
      } catch (error) {
        console.error('NotificationSystem: Erro ao exibir notificação:', error);
        this.fallbackNotification(message, type);
      }
    } else {
      // Armazena notificação para processar quando inicializado
      this.addPendingNotification(notification);
    }
  }

  /**
   * Adiciona notificação à lista de pendentes
   * @private
   */
  addPendingNotification(notification) {
    if (!this.pendingNotifications) {
      this.pendingNotifications = [];
    }
    
    // Limita a 10 notificações pendentes para evitar memory leak
    if (this.pendingNotifications.length >= 10) {
      this.pendingNotifications.shift();
    }
    
    this.pendingNotifications.push(notification);
  }

  /**
   * Processa notificações pendentes
   * @private
   */
  processPendingNotifications() {
    if (!this.pendingNotifications || this.pendingNotifications.length === 0) {
      return;
    }

    const notifications = [...this.pendingNotifications];
    this.pendingNotifications = [];

    notifications.forEach(notification => {
      this.show(notification.message, notification.type);
    });
  }

  /**
   * Notificação de fallback quando o handler principal falha
   * @private
   */
  fallbackNotification(message, type) {
    const prefix = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    console.log(`${prefix[type] || 'ℹ️'} ${message}`);
    
    // Tenta usar alert como último recurso apenas para erros críticos
    if (type === 'error' && typeof alert !== 'undefined') {
      alert(`Erro: ${message}`);
    }
  }

  /**
   * Verifica se o sistema está inicializado
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Reseta o sistema (útil para testes)
   */
  reset() {
    this.initialized = false;
    this.notificationHandler = null;
    this.pendingNotifications = [];
    this.listeners.clear();
  }
}

// Instância exportada do sistema de notificações
export const notificationSystem = new NotificationSystem();

// Função exportada compatível com o código existente
export function showNotification(message, type = 'info') {
  notificationSystem.show(message, type);
}