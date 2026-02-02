/**
 * Sistema de Tratamento de Erros Assíncronos
 * Implementa tratamento robusto para operações assíncronas críticas
 * Autor: Sistema de Segurança
 * Data: 2024
 */

import { eventBus } from './eventBus.js';
import { showNotification } from './notificationSystem.js';

export class AsyncErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.criticalErrors = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    // Configurações de timeout
    this.timeouts = {
      localStorage: 5000,
      jsonParse: 3000,
      fetch: 10000,
      general: 8000
    };
    
    this.initializeErrorHandling();
  }

  /**
   * Inicializa o sistema de tratamento de erros
   */
  initializeErrorHandling() {
    // Interceptar erros não capturados
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, 'global', event.filename, event.lineno);
    });

    // Interceptar promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'promise', 'unhandled_promise');
      event.preventDefault(); // Previne que o erro apareça no console
    });

    console.log('✅ AsyncErrorHandler inicializado');
  }

  /**
   * Wrapper seguro para operações localStorage
   */
  async safeLocalStorage(operation, key, value = null, options = {}) {
    const operationId = `localStorage_${operation}_${key}_${Date.now()}`;
    
    try {
      return await this.withTimeout(async () => {
        switch (operation) {
          case 'getItem':
            const item = localStorage.getItem(key);
            return item;
            
          case 'setItem':
            if (value === null) {
              throw new Error('Valor não pode ser null para setItem');
            }
            localStorage.setItem(key, value);
            return true;
            
          case 'removeItem':
            localStorage.removeItem(key);
            return true;
            
          case 'clear':
            localStorage.clear();
            return true;
            
          case 'key':
            return localStorage.key(value || 0);
            
          default:
            throw new Error(`Operação localStorage inválida: ${operation}`);
        }
      }, this.timeouts.localStorage, operationId);
      
    } catch (error) {
      return this.handleAsyncError(error, 'localStorage', {
        operation,
        key,
        hasValue: value !== null,
        operationId,
        ...options
      });
    }
  }

  /**
   * Wrapper seguro para JSON.parse
   */
  async safeJsonParse(jsonString, fallbackValue = null, options = {}) {
    const operationId = `jsonParse_${Date.now()}`;
    
    try {
      return await this.withTimeout(async () => {
        if (typeof jsonString !== 'string') {
          throw new Error('Input deve ser uma string válida');
        }
        
        if (jsonString.trim() === '') {
          return fallbackValue;
        }
        
        return JSON.parse(jsonString);
      }, this.timeouts.jsonParse, operationId);
      
    } catch (error) {
      this.logError('JSON Parse Error', {
        error: error.message,
        input: typeof jsonString === 'string' ? jsonString.substring(0, 100) : 'invalid_type',
        fallbackUsed: true,
        operationId,
        ...options
      });
      
      return fallbackValue;
    }
  }

  /**
   * Wrapper seguro para operações com timeout
   */
  async withTimeout(asyncOperation, timeoutMs, operationId) {
    return new Promise(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Operação ${operationId} excedeu timeout de ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await asyncOperation();
        clearTimeout(timeoutHandle);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Wrapper seguro para fetch
   */
  async safeFetch(url, options = {}, retryOptions = {}) {
    const operationId = `fetch_${url}_${Date.now()}`;
    const maxRetries = retryOptions.maxRetries || this.maxRetries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(async () => {
          const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(this.timeouts.fetch)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return response;
        }, this.timeouts.fetch, operationId);
        
      } catch (error) {
        if (attempt === maxRetries) {
          return this.handleAsyncError(error, 'fetch', {
            url,
            attempt: attempt + 1,
            maxRetries,
            operationId,
            ...retryOptions
          });
        }
        
        // Aguardar antes de tentar novamente
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * Wrapper seguro para setTimeout
   */
  safeSetTimeout(callback, delay, options = {}) {
    const operationId = `setTimeout_${Date.now()}`;
    
    try {
      return setTimeout(() => {
        try {
          callback();
        } catch (error) {
          this.handleAsyncError(error, 'setTimeout', {
            delay,
            operationId,
            ...options
          });
        }
      }, delay);
    } catch (error) {
      this.handleAsyncError(error, 'setTimeout_setup', {
        delay,
        operationId,
        ...options
      });
      return null;
    }
  }

  /**
   * Wrapper seguro para setInterval
   */
  safeSetInterval(callback, interval, options = {}) {
    const operationId = `setInterval_${Date.now()}`;
    
    try {
      return setInterval(() => {
        try {
          callback();
        } catch (error) {
          this.handleAsyncError(error, 'setInterval', {
            interval,
            operationId,
            ...options
          });
        }
      }, interval);
    } catch (error) {
      this.handleAsyncError(error, 'setInterval_setup', {
        interval,
        operationId,
        ...options
      });
      return null;
    }
  }

  /**
   * Tratamento centralizado de erros assíncronos
   */
  handleAsyncError(error, context, metadata = {}) {
    const errorInfo = {
      message: error.message || 'Erro desconhecido',
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      metadata,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Adicionar ao log
    this.addToErrorLog(errorInfo);

    // Verificar se é erro crítico
    if (this.isCriticalError(error, context)) {
      this.handleCriticalError(errorInfo);
    }

    // Emitir evento via EventBus se disponível
    if (eventBus) {
      eventBus.emit('async:error', errorInfo);
    }

    // Notificar usuário se necessário
    if (metadata.notifyUser !== false) {
      this.notifyUser(errorInfo);
    }

    // Retornar valor de fallback se fornecido
    return metadata.fallback || null;
  }

  /**
   * Tratamento de erros globais
   */
  handleGlobalError(error, type, source, line) {
    const errorInfo = {
      message: error.message || error.toString(),
      type,
      source,
      line,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    this.addToErrorLog(errorInfo);

    if (window.eventBus) {
      window.eventBus.emit('global:error', errorInfo);
    }

    console.error('🚨 Erro global capturado:', errorInfo);
  }

  /**
   * Verifica se é um erro crítico
   */
  isCriticalError(error, context) {
    const criticalContexts = ['localStorage', 'fetch', 'jsonParse'];
    const criticalMessages = ['quota', 'network', 'timeout', 'permission'];
    
    return criticalContexts.includes(context) || 
           criticalMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  /**
   * Tratamento de erros críticos
   */
  handleCriticalError(errorInfo) {
    this.criticalErrors.add(errorInfo.id);
    
    console.error('🚨 ERRO CRÍTICO:', errorInfo);
    
    // Tentar salvar estado de emergência
    try {
      const emergencyState = {
        timestamp: new Date().toISOString(),
        error: errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      sessionStorage.setItem('emergencyState', JSON.stringify(emergencyState));
    } catch (e) {
      console.error('Falha ao salvar estado de emergência:', e);
    }
  }

  /**
   * Adiciona erro ao log
   */
  addToErrorLog(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // Manter tamanho do log controlado
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Notifica o usuário sobre erros
   */
  notifyUser(errorInfo) {
    const userMessage = this.getUserFriendlyMessage(errorInfo);
    
    if (window.safeShowNotification) {
      window.safeShowNotification(userMessage, 'error');
    } else if (window.showNotification) {
      window.showNotification(userMessage, 'error');
    } else {
      console.error('Erro:', userMessage);
    }
  }

  /**
   * Converte erro técnico em mensagem amigável
   */
  getUserFriendlyMessage(errorInfo) {
    const { context, message } = errorInfo;
    
    if (context === 'localStorage') {
      if (message.includes('quota')) {
        return 'Espaço de armazenamento esgotado. Limpe alguns dados antigos.';
      }
      return 'Erro ao salvar dados. Tente novamente.';
    }
    
    if (context === 'fetch') {
      if (message.includes('network')) {
        return 'Erro de conexão. Verifique sua internet.';
      }
      return 'Erro ao carregar dados do servidor.';
    }
    
    if (context === 'jsonParse') {
      return 'Dados corrompidos detectados. Usando valores padrão.';
    }
    
    return 'Ocorreu um erro inesperado. Tente recarregar a página.';
  }

  /**
   * Utilitário para delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log seguro de erros
   */
  logError(message, details = {}) {
    const logEntry = {
      message,
      details,
      timestamp: new Date().toISOString(),
      level: 'error'
    };
    
    console.error(`[AsyncErrorHandler] ${message}:`, details);
    this.addToErrorLog(logEntry);
  }

  /**
   * Obtém relatório de erros
   */
  getErrorReport() {
    return {
      totalErrors: this.errorLog.length,
      criticalErrors: this.criticalErrors.size,
      recentErrors: this.errorLog.slice(-10),
      errorsByContext: this.getErrorsByContext(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Agrupa erros por contexto
   */
  getErrorsByContext() {
    const grouped = {};
    this.errorLog.forEach(error => {
      const context = error.context || 'unknown';
      grouped[context] = (grouped[context] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Limpa log de erros
   */
  clearErrorLog() {
    this.errorLog = [];
    this.criticalErrors.clear();
    console.log('📝 Log de erros limpo');
  }
}

// Inicializar e exportar
export const asyncErrorHandler = new AsyncErrorHandler();

// Funções de conveniência exportadas
export const safeLocalStorage = (operation, key, value, options) => {
  return asyncErrorHandler.safeLocalStorage(operation, key, value, options);
};

export const safeJsonParse = (jsonString, fallback, options) => {
  return asyncErrorHandler.safeJsonParse(jsonString, fallback, options);
};

export const safeFetch = (url, options, retryOptions) => {
  return asyncErrorHandler.safeFetch(url, options, retryOptions);
};

export const safeSetTimeout = (callback, delay, options) => {
  return asyncErrorHandler.safeSetTimeout(callback, delay, options);
};

export const safeSetInterval = (callback, interval, options) => {
  return asyncErrorHandler.safeSetInterval(callback, interval, options);
};

console.log('✅ AsyncErrorHandler carregado');