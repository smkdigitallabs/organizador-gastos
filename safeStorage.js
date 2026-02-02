/**
 * Módulo de Armazenamento Seguro
 * Encapsula operações localStorage e JSON.parse com tratamento de erros robusto
 * @author Sistema de Debug Especializado
 * @version 1.0.0
 */

class SafeStorage {
  constructor() {
    this.isAvailable = this.checkStorageAvailability();
    this.fallbackData = new Map();
  }

  /**
   * Verifica se localStorage está disponível
   * @private
   * @returns {boolean}
   */
  checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('SafeStorage: localStorage não disponível, usando fallback em memória');
      return false;
    }
  }

  /**
   * Obtém item do localStorage com tratamento de erros
   * @param {string} key - Chave do item
   * @param {*} defaultValue - Valor padrão se não encontrado ou erro
   * @returns {*} Valor armazenado ou valor padrão
   */
  getItem(key, defaultValue = null) {
    if (!key || typeof key !== 'string') {
      console.warn('SafeStorage.getItem: Chave deve ser uma string válida');
      return defaultValue;
    }

    try {
      if (this.isAvailable) {
        const item = localStorage.getItem(key);
        return item !== null ? item : defaultValue;
      } else {
        return this.fallbackData.get(key) || defaultValue;
      }
    } catch (error) {
      console.error(`SafeStorage.getItem: Erro ao acessar '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Define item no localStorage com tratamento de erros
   * @param {string} key - Chave do item
   * @param {*} value - Valor a ser armazenado
   * @returns {boolean} Sucesso da operação
   */
  setItem(key, value) {
    if (!key || typeof key !== 'string') {
      console.warn('SafeStorage.setItem: Chave deve ser uma string válida');
      return false;
    }

    try {
      const stringValue = typeof value === 'string' ? value : String(value);
      
      if (this.isAvailable) {
        localStorage.setItem(key, stringValue);
      } else {
        this.fallbackData.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error(`SafeStorage.setItem: Erro ao salvar '${key}':`, error);
      
      // Tentar fallback em memória se localStorage falhar
      if (this.isAvailable) {
        try {
          this.fallbackData.set(key, String(value));
          console.warn(`SafeStorage: Usando fallback em memória para '${key}'`);
          return true;
        } catch (fallbackError) {
          console.error(`SafeStorage: Fallback também falhou para '${key}':`, fallbackError);
        }
      }
      return false;
    }
  }

  /**
   * Parse seguro de JSON com tratamento de erros
   * @param {string} jsonString - String JSON para fazer parse
   * @param {*} defaultValue - Valor padrão em caso de erro
   * @returns {*} Objeto parseado ou valor padrão
   */
  parseJSON(jsonString, defaultValue = null) {
    if (!jsonString || typeof jsonString !== 'string') {
      return defaultValue;
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('SafeStorage.parseJSON: Erro ao fazer parse do JSON:', error);
      console.debug('SafeStorage.parseJSON: String problemática:', jsonString.substring(0, 100) + '...');
      return defaultValue;
    }
  }

  /**
   * Stringify seguro de JSON com tratamento de erros
   * @param {*} data - Dados para stringify
   * @param {string} fallbackValue - Valor padrão em caso de erro
   * @returns {string} String JSON ou valor padrão
   */
  stringifyJSON(data, fallbackValue = '{}') {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('SafeStorage.stringifyJSON: Erro ao converter para JSON:', error);
      return fallbackValue;
    }
  }

  /**
   * Obtém e faz parse de dados JSON do localStorage (Alias para getJSON)
   * @param {string} key - Chave do item
   * @param {*} defaultValue - Valor padrão
   * @returns {*} Dados parseados ou valor padrão
   */
  getObject(key, defaultValue = null) {
    return this.getJSON(key, defaultValue);
  }

  /**
   * Obtém e faz parse de dados JSON do localStorage
   * @param {string} key - Chave do item
   * @param {*} defaultValue - Valor padrão
   * @returns {*} Dados parseados ou valor padrão
   */
  getJSON(key, defaultValue = null) {
    const jsonString = this.getItem(key);
    if (!jsonString) {
      return defaultValue;
    }
    return this.parseJSON(jsonString, defaultValue);
  }

  /**
   * Converte dados para JSON e salva no localStorage
   * @param {string} key - Chave do item
   * @param {*} data - Dados para salvar
   * @returns {boolean} Sucesso da operação
   */
  setJSON(key, data) {
    const jsonString = this.stringifyJSON(data);
    return this.setItem(key, jsonString);
  }

  /**
   * Remove item do localStorage
   * @param {string} key - Chave do item
   * @returns {boolean} Sucesso da operação
   */
  removeItem(key) {
    if (!key || typeof key !== 'string') {
      console.warn('SafeStorage.removeItem: Chave deve ser uma string válida');
      return false;
    }

    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      } else {
        this.fallbackData.delete(key);
      }
      return true;
    } catch (error) {
      console.error(`SafeStorage.removeItem: Erro ao remover '${key}':`, error);
      return false;
    }
  }

  /**
   * Limpa todo o localStorage
   * @returns {boolean} Sucesso da operação
   */
  clear() {
    try {
      if (this.isAvailable) {
        localStorage.clear();
      } else {
        this.fallbackData.clear();
      }
      return true;
    } catch (error) {
      console.error('SafeStorage.clear: Erro ao limpar storage:', error);
      return false;
    }
  }

  /**
   * Verifica se uma chave existe
   * @param {string} key - Chave para verificar
   * @returns {boolean} Se a chave existe
   */
  hasItem(key) {
    try {
      if (this.isAvailable) {
        return localStorage.getItem(key) !== null;
      } else {
        return this.fallbackData.has(key);
      }
    } catch (error) {
      console.error(`SafeStorage.hasItem: Erro ao verificar '${key}':`, error);
      return false;
    }
  }

  /**
   * Obtém informações sobre o storage
   * @returns {Object} Informações do storage
   */
  getStorageInfo() {
    return {
      isAvailable: this.isAvailable,
      fallbackItemsCount: this.fallbackData.size,
      storageType: this.isAvailable ? 'localStorage' : 'memory'
    };
  }
}

// Instância global do SafeStorage
export const safeStorage = new SafeStorage();