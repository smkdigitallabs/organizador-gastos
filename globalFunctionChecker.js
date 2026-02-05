/**
 * Sistema de Verificação de Funções Globais
 * Implementa verificações de existência para todas as chamadas de funções globais
 * Parte da correção dos problemas críticos da auditoria
 */

import { eventBus } from './eventBus.js';

export class GlobalFunctionChecker {
    constructor() {
        this.missingFunctions = new Set();
        this.fallbackHandlers = new Map();
        this.debugMode = false;
        
        // Inicializar verificações
        this.initializeFallbacks();
    }

    /**
     * Inicializa handlers de fallback para funções críticas
     */
    initializeFallbacks() {
        // Namespace seguro para funções globais
        this.safeNamespace = {
            notifications: null,
            dashboard: null,
            autoSave: null,
            ai: null
        };
        
        // Fallback para showNotification
        this.fallbackHandlers.set('showNotification', (message, type = 'info') => {
            console.log(`[NOTIFICATION ${type.toUpperCase()}]: ${message}`);
            
            // Emitir evento via EventBus se disponível
            if (window.eventBus) {
                window.eventBus.emit('notification:fallback', { message, type, timestamp: new Date().toISOString() });
            }
            
            // Tentar usar alert como último recurso para erros críticos
            if (type === 'error') {
                if (typeof alert !== 'undefined') {
                    alert(`Erro: ${message}`);
                }
            }
        });

        // Fallback para loadAutoSaveVersions
        this.fallbackHandlers.set('loadAutoSaveVersions', () => {
            console.log('[FALLBACK]: loadAutoSaveVersions não disponível');
            if (eventBus) {
                eventBus.emit('autosave:load:fallback', { timestamp: new Date().toISOString() });
            }
        });

        // Fallback para updateDashboard
        this.fallbackHandlers.set('updateDashboard', () => {
            console.log('[FALLBACK]: updateDashboard não disponível');
            if (eventBus) {
                eventBus.emit('dashboard:update:fallback', { timestamp: new Date().toISOString() });
            }
        });

        // Fallback para setupEventListeners
        this.fallbackHandlers.set('setupEventListeners', () => {
            console.log('[FALLBACK]: setupEventListeners não disponível');
            if (eventBus) {
                eventBus.emit('events:setup:fallback', { timestamp: new Date().toISOString() });
            }
        });

        // Fallback para generateAIRecommendations
        this.fallbackHandlers.set('generateAIRecommendations', () => {
            console.log('[FALLBACK]: generateAIRecommendations não disponível');
            if (eventBus) {
                eventBus.emit('ai:recommendations:fallback', { timestamp: new Date().toISOString() });
            }
        });

        // Fallback para analyzeUserData
        this.fallbackHandlers.set('analyzeUserData', () => {
            console.log('[FALLBACK]: analyzeUserData não disponível');
            return [];
        });

        // Fallback para getCategoryIcon
        this.fallbackHandlers.set('getCategoryIcon', (category) => {
            console.log(`[FALLBACK]: getCategoryIcon não disponível para categoria: ${category}`);
            return 'fas fa-question-circle'; // Ícone padrão
        });
    }

    /**
     * Verifica se uma função existe no escopo global
     * @param {string} functionName - Nome da função
     * @returns {boolean} - True se a função existe
     */
    functionExists(functionName) {
        try {
            // Verificar no window (browser)
            if (typeof window !== 'undefined' && typeof window[functionName] === 'function') {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Chama uma função de forma segura, com fallback se necessário
     * @param {string} functionName - Nome da função
     * @param {...any} args - Argumentos da função
     * @returns {any} - Resultado da função ou fallback
     */
    safeCall(functionName, ...args) {
        try {
            if (this.functionExists(functionName)) {
                // Função existe, chamar normalmente
                if (typeof window !== 'undefined' && window[functionName]) {
                    return window[functionName](...args);
                } else {
                    // Fallback seguro em vez de eval
                    console.warn(`[GLOBAL CHECKER]: Tentativa de chamada insegura evitada para ${functionName}`);
                    return null;
                }
            } else {
                // Função não existe, usar fallback
                this.handleMissingFunction(functionName, args);
                
                const fallback = this.fallbackHandlers.get(functionName);
                if (fallback) {
                    return fallback(...args);
                }
                
                return null;
            }
        } catch (error) {
            this.logError(`Erro ao chamar função ${functionName}:`, error);
            
            // Tentar fallback em caso de erro
            const fallback = this.fallbackHandlers.get(functionName);
            if (fallback) {
                try {
                    return fallback(...args);
                } catch (fallbackError) {
                    this.logError(`Erro no fallback de ${functionName}:`, fallbackError);
                }
            }
            
            return null;
        }
    }

    /**
     * Registra uma função como ausente e tenta soluções
     * @param {string} functionName - Nome da função ausente
     * @param {Array} args - Argumentos que seriam passados
     */
    handleMissingFunction(functionName, args) {
        if (!this.missingFunctions.has(functionName)) {
            this.missingFunctions.add(functionName);
            
            if (this.debugMode) {
                console.warn(`[GLOBAL CHECKER]: Função '${functionName}' não encontrada. Usando fallback.`);
                console.log(`[GLOBAL CHECKER]: Argumentos:`, args);
            }

            // Tentar carregar função dinamicamente baseada no nome
            this.tryDynamicLoad(functionName);
        }
    }

    /**
     * Tenta carregar uma função dinamicamente
     * @param {string} functionName - Nome da função
     */
    tryDynamicLoad(functionName) {
        // Mapeamento de funções para seus módulos/arquivos
        const functionModules = {
            'showNotification': 'notificationSystem.js',
            'loadAutoSaveVersions': 'script.js',
            'updateDashboard': 'script.js',
            'setupEventListeners': 'script.js',
            'generateAIRecommendations': 'script.js',
            'analyzeUserData': 'script.js',
            'getCategoryIcon': 'script.js'
        };

        const moduleFile = functionModules[functionName];
        if (moduleFile && this.debugMode) {
            console.log(`[GLOBAL CHECKER]: Função '${functionName}' deveria estar em '${moduleFile}'`);
        }
    }

    /**
     * Registra um handler de fallback personalizado
     * @param {string} functionName - Nome da função
     * @param {Function} handler - Handler de fallback
     */
    registerFallback(functionName, handler) {
        if (typeof handler === 'function') {
            this.fallbackHandlers.set(functionName, handler);
            
            if (this.debugMode) {
                console.log(`[GLOBAL CHECKER]: Fallback registrado para '${functionName}'`);
            }
        }
    }

    /**
     * Ativa/desativa modo debug
     * @param {boolean} enabled - Se deve ativar debug
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
    }

    /**
     * Retorna lista de funções ausentes
     * @returns {Array<string>} - Lista de funções ausentes
     */
    getMissingFunctions() {
        return Array.from(this.missingFunctions);
    }

    /**
     * Limpa lista de funções ausentes
     */
    clearMissingFunctions() {
        this.missingFunctions.clear();
    }

    /**
     * Log de erros com tratamento seguro
     * @param {string} message - Mensagem de erro
     * @param {Error} error - Objeto de erro
     */
    logError(message, error) {
        try {
            if (typeof console !== 'undefined' && console.error) {
                console.error(message, error);
            }
        } catch (logError) {
            // Silenciar erros de logging
        }
    }

    /**
     * Verifica múltiplas funções de uma vez
     * @param {Array<string>} functionNames - Lista de nomes de funções
     * @returns {Object} - Mapa de função -> existe
     */
    checkMultipleFunctions(functionNames) {
        const results = {};
        
        functionNames.forEach(name => {
            results[name] = this.functionExists(name);
        });
        
        return results;
    }

    /**
     * Executa verificação de saúde do sistema
     * @returns {Object} - Relatório de saúde
     */
    healthCheck() {
        const criticalFunctions = [
            'showNotification',
            'loadAutoSaveVersions', 
            'updateDashboard',
            'setupEventListeners'
        ];

        const results = this.checkMultipleFunctions(criticalFunctions);
        const missing = Object.entries(results)
            .filter(([name, exists]) => !exists)
            .map(([name]) => name);

        return {
            allCriticalFunctionsAvailable: missing.length === 0,
            missingCriticalFunctions: missing,
            totalMissingFunctions: this.getMissingFunctions(),
            fallbacksAvailable: this.fallbackHandlers.size
        };
    }
}

// Criar instância global
export const globalFunctionChecker = new GlobalFunctionChecker();

// Adicionar métodos estáticos à classe para compatibilidade com testes
GlobalFunctionChecker.exists = (functionName) => globalFunctionChecker.functionExists(functionName);
GlobalFunctionChecker.safeCall = (functionName, ...args) => globalFunctionChecker.safeCall(functionName, ...args);

// Funções de conveniência globais
// Funções de conveniência para uso seguro das funções globais
window.safeShowNotification = function(message, type = 'info') {
    return globalFunctionChecker.safeCall('showNotification', message, type);
};

window.safeUpdateDashboard = function() {
    return globalFunctionChecker.safeCall('updateDashboard');
};

window.safeLoadAutoSaveVersions = function() {
    return globalFunctionChecker.safeCall('loadAutoSaveVersions');
};

window.safeGenerateAIRecommendations = function() {
    return globalFunctionChecker.safeCall('generateAIRecommendations');
};

// Função genérica para chamadas seguras
window.safeCall = function(functionName, ...args) {
    return globalFunctionChecker.safeCall(functionName, ...args);
};

window.checkFunction = function(functionName) {
    return globalFunctionChecker.functionExists(functionName);
};

window.registerFallback = function(functionName, handler) {
    return globalFunctionChecker.registerFallback(functionName, handler);
};

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlobalFunctionChecker, globalFunctionChecker };
}

// Disponibilizar no window
window.GlobalFunctionChecker = GlobalFunctionChecker;
window.globalFunctionChecker = globalFunctionChecker;

// Log de inicialização
console.log('[GLOBAL CHECKER]: Sistema de verificação de funções globais inicializado');