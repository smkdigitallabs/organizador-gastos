/**
 * Sistema de Eventos Centralizado
 * Elimina dependências circulares entre módulos
 * Implementa padrão Observer/Publisher-Subscriber
 * @author Sistema de Debug Especializado
 * @version 1.0.0
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
        this.maxListeners = 50; // Prevenir memory leaks
        
        // Inicializar sistema
        this.initialize();
    }

    /**
     * Inicializa o sistema de eventos
     */
    initialize() {
        // Eventos críticos do sistema
        this.registerSystemEvents();
        
        if (this.debugMode) {
            console.log('[EVENT BUS]: Sistema de eventos inicializado');
        }
    }

    /**
     * Registra eventos críticos do sistema
     */
    registerSystemEvents() {
        // Eventos de dados
        this.createEvent('data:saved');
        this.createEvent('data:loaded');
        this.createEvent('data:changed');
        this.createEvent('data:error');
        
        // Eventos de UI
        this.createEvent('ui:notification');
        this.createEvent('ui:dashboard:update');
        this.createEvent('ui:autosave:toggle');
        
        // Eventos de sistema
        this.createEvent('system:ready');
        this.createEvent('system:error');
        this.createEvent('system:shutdown');
    }

    /**
     * Cria um novo evento no sistema
     * @param {string} eventName - Nome do evento
     */
    createEvent(eventName) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
    }

    /**
     * Registra um listener para um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} options - Opções do listener
     */
    on(eventName, callback, options = {}) {
        try {
            // Validar parâmetros
            if (typeof eventName !== 'string' || !eventName.trim()) {
                throw new Error('Nome do evento deve ser uma string não vazia');
            }
            
            if (typeof callback !== 'function') {
                throw new Error('Callback deve ser uma função');
            }

            // Criar evento se não existir
            this.createEvent(eventName);
            
            const listeners = this.events.get(eventName);
            
            // Verificar limite de listeners
            if (listeners.size >= this.maxListeners) {
                console.warn(`[EVENT BUS]: Muitos listeners para evento '${eventName}' (${listeners.size})`);
            }

            // Criar wrapper do listener com opções
            const listenerWrapper = {
                callback,
                once: options.once || false,
                priority: options.priority || 0,
                id: options.id || `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            listeners.add(listenerWrapper);

            if (this.debugMode) {
                console.log(`[EVENT BUS]: Listener registrado para '${eventName}'`);
            }

            // Retornar função para remover listener
            return () => this.off(eventName, listenerWrapper.id);
            
        } catch (error) {
            console.error('[EVENT BUS]: Erro ao registrar listener:', error);
            return () => {}; // Retornar função vazia em caso de erro
        }
    }

    /**
     * Remove um listener de um evento
     * @param {string} eventName - Nome do evento
     * @param {string} listenerId - ID do listener
     */
    off(eventName, listenerId) {
        try {
            const listeners = this.events.get(eventName);
            if (!listeners) return false;

            for (const listener of listeners) {
                if (listener.id === listenerId) {
                    listeners.delete(listener);
                    
                    if (this.debugMode) {
                        console.log(`[EVENT BUS]: Listener removido de '${eventName}'`);
                    }
                    
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('[EVENT BUS]: Erro ao remover listener:', error);
            return false;
        }
    }

    /**
     * Emite um evento para todos os listeners
     * @param {string} eventName - Nome do evento
     * @param {*} data - Dados do evento
     * @param {Object} options - Opções de emissão
     */
    emit(eventName, data = null, options = {}) {
        try {
            const listeners = this.events.get(eventName);
            if (!listeners || listeners.size === 0) {
                if (this.debugMode) {
                    console.log(`[EVENT BUS]: Nenhum listener para evento '${eventName}'`);
                }
                return false;
            }

            // Converter para array e ordenar por prioridade
            const sortedListeners = Array.from(listeners).sort((a, b) => b.priority - a.priority);
            
            let executedCount = 0;
            const listenersToRemove = [];

            // Executar listeners
            for (const listener of sortedListeners) {
                try {
                    // Executar callback
                    const result = listener.callback(data, eventName);
                    
                    // Se retornar false, parar propagação
                    if (result === false && !options.ignoreStopPropagation) {
                        break;
                    }
                    
                    executedCount++;
                    
                    // Remover listener se for 'once'
                    if (listener.once) {
                        listenersToRemove.push(listener);
                    }
                    
                } catch (callbackError) {
                    console.error(`[EVENT BUS]: Erro no callback do evento '${eventName}':`, callbackError);
                    
                    // Remover listener problemático se configurado
                    if (options.removeOnError) {
                        listenersToRemove.push(listener);
                    }
                }
            }

            // Remover listeners marcados
            listenersToRemove.forEach(listener => listeners.delete(listener));

            if (this.debugMode) {
                console.log(`[EVENT BUS]: Evento '${eventName}' emitido para ${executedCount} listeners`);
            }

            return executedCount > 0;
            
        } catch (error) {
            console.error('[EVENT BUS]: Erro ao emitir evento:', error);
            return false;
        }
    }

    /**
     * Registra um listener que executa apenas uma vez
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} options - Opções adicionais
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Remove todos os listeners de um evento
     * @param {string} eventName - Nome do evento
     */
    removeAllListeners(eventName) {
        try {
            if (eventName) {
                // Remover listeners de um evento específico
                const listeners = this.events.get(eventName);
                if (listeners) {
                    listeners.clear();
                    
                    if (this.debugMode) {
                        console.log(`[EVENT BUS]: Todos os listeners removidos de '${eventName}'`);
                    }
                }
            } else {
                // Remover todos os listeners de todos os eventos
                this.events.clear();
                this.registerSystemEvents();
                
                if (this.debugMode) {
                    console.log('[EVENT BUS]: Todos os listeners removidos');
                }
            }
        } catch (error) {
            console.error('[EVENT BUS]: Erro ao remover listeners:', error);
        }
    }

    /**
     * Retorna estatísticas do sistema de eventos
     */
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalListeners: 0,
            eventDetails: {}
        };

        for (const [eventName, listeners] of this.events) {
            const listenerCount = listeners.size;
            stats.totalListeners += listenerCount;
            stats.eventDetails[eventName] = listenerCount;
        }

        return stats;
    }

    /**
     * Ativa/desativa modo debug
     * @param {boolean} enabled - Ativar debug
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
        console.log(`[EVENT BUS]: Modo debug ${enabled ? 'ativado' : 'desativado'}`);
    }

    /**
     * Limpa recursos e prepara para destruição
     */
    destroy() {
        try {
            this.removeAllListeners();
            this.events.clear();
            
            if (this.debugMode) {
                console.log('[EVENT BUS]: Sistema de eventos destruído');
            }
        } catch (error) {
            console.error('[EVENT BUS]: Erro ao destruir sistema:', error);
        }
    }
}

// Criar instância global única (Singleton)
const eventBus = new EventBus();

// Funções de conveniência globais
window.eventBus = eventBus;

// Funções de conveniência
window.on = (eventName, callback, options) => eventBus.on(eventName, callback, options);
window.emit = (eventName, data, options) => eventBus.emit(eventName, data, options);
window.once = (eventName, callback, options) => eventBus.once(eventName, callback, options);

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
}

// Disponibilizar no window
window.EventBus = EventBus;

// Log de inicialização
console.log('[EVENT BUS]: Sistema de eventos centralizado inicializado');

// Emitir evento de sistema pronto
setTimeout(() => {
    eventBus.emit('system:ready', { timestamp: Date.now() });
}, 100);