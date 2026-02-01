/**
 * Sistema de Auto-Save Inteligente
 * Implementa detecção de inatividade, debounce e otimizações de performance
 * Parte da correção dos problemas críticos da auditoria
 */

class SmartAutoSave {
    constructor(options = {}) {
        // Configurações padrão
        this.config = {
            // Intervalo base de auto-save (ms)
            baseInterval: options.baseInterval || 30000, // 30 segundos
            
            // Intervalo durante inatividade (ms)
            inactiveInterval: options.inactiveInterval || 120000, // 2 minutos
            
            // Tempo para considerar usuário inativo (ms)
            inactivityThreshold: options.inactivityThreshold || 60000, // 1 minuto
            
            // Debounce para mudanças rápidas (ms)
            debounceDelay: options.debounceDelay || 5000, // 5 segundos
            
            // Máximo de versões de auto-save
            maxVersions: options.maxVersions || 10,
            
            // Ativar logs de debug
            debug: options.debug || false,
            
            // Callback para salvar dados
            saveCallback: options.saveCallback || null,
            
            // Callback para verificar se há mudanças
            hasChangesCallback: options.hasChangesCallback || null
        };

        // Estado interno
        this.state = {
            isActive: false,
            lastActivity: Date.now(),
            lastSave: Date.now(),
            pendingSave: false,
            saveCount: 0,
            isUserActive: true,
            currentInterval: this.config.baseInterval
        };

        // Timers
        this.timers = {
            autoSave: null,
            debounce: null,
            activityCheck: null
        };

        // Eventos monitorados para detectar atividade
        this.activityEvents = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 
            'touchstart', 'click', 'focus', 'blur'
        ];

        // Inicializar sistema
        this.initialize();
    }

    /**
     * Inicializa o sistema de auto-save inteligente
     */
    initialize() {
        try {
            this.log('Inicializando sistema de auto-save inteligente...');
            
            // Configurar detecção de atividade
            this.setupActivityDetection();
            
            // Configurar verificação periódica de inatividade
            this.setupInactivityCheck();
            
            // Iniciar auto-save
            this.start();
            
            this.log('Sistema de auto-save inteligente inicializado com sucesso');
        } catch (error) {
            console.error('[SMART AUTO-SAVE]: Erro na inicialização:', error);
        }
    }

    /**
     * Configura detecção de atividade do usuário
     */
    setupActivityDetection() {
        const handleActivity = this.debounce(() => {
            this.updateActivity();
        }, 1000); // Debounce de 1 segundo para eventos de atividade

        this.activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Detectar mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateActivity();
            }
        });
    }

    /**
     * Configura verificação periódica de inatividade
     */
    setupInactivityCheck() {
        this.timers.activityCheck = setInterval(() => {
            this.checkInactivity();
        }, 10000); // Verificar a cada 10 segundos
    }

    /**
     * Atualiza timestamp da última atividade
     */
    updateActivity() {
        const now = Date.now();
        const wasInactive = !this.state.isUserActive;
        
        this.state.lastActivity = now;
        this.state.isUserActive = true;

        // Se estava inativo e voltou a ficar ativo, ajustar intervalo
        if (wasInactive) {
            this.log('Usuário voltou a ficar ativo');
            this.adjustSaveInterval();
        }
    }

    /**
     * Verifica se o usuário está inativo
     */
    checkInactivity() {
        const now = Date.now();
        const timeSinceActivity = now - this.state.lastActivity;
        const wasActive = this.state.isUserActive;

        this.state.isUserActive = timeSinceActivity < this.config.inactivityThreshold;

        // Se mudou de ativo para inativo, ajustar intervalo
        if (wasActive && !this.state.isUserActive) {
            this.log('Usuário ficou inativo');
            this.adjustSaveInterval();
        }
    }

    /**
     * Ajusta o intervalo de auto-save baseado na atividade
     */
    adjustSaveInterval() {
        const newInterval = this.state.isUserActive 
            ? this.config.baseInterval 
            : this.config.inactiveInterval;

        if (newInterval !== this.state.currentInterval) {
            this.state.currentInterval = newInterval;
            this.log(`Intervalo de auto-save ajustado para: ${newInterval}ms`);
            
            // Reiniciar timer com novo intervalo
            if (this.state.isActive) {
                this.restart();
            }
        }
    }

    /**
     * Inicia o sistema de auto-save
     */
    start() {
        if (this.state.isActive) {
            this.log('Auto-save já está ativo');
            return;
        }

        this.state.isActive = true;
        this.scheduleNextSave();
        this.log('Auto-save iniciado');
    }

    /**
     * Para o sistema de auto-save
     */
    stop() {
        if (!this.state.isActive) {
            this.log('Auto-save já está parado');
            return;
        }

        this.state.isActive = false;
        this.clearTimers();
        this.log('Auto-save parado');
    }

    /**
     * Reinicia o sistema de auto-save
     */
    restart() {
        this.stop();
        this.start();
    }

    /**
     * Agenda o próximo auto-save
     */
    scheduleNextSave() {
        if (!this.state.isActive) return;

        this.clearTimer('autoSave');
        
        this.timers.autoSave = setTimeout(() => {
            this.performSave();
        }, this.state.currentInterval);
    }

    /**
     * Executa o auto-save com debounce
     */
    performSave() {
        if (!this.state.isActive) return;

        // Verificar se há mudanças pendentes
        if (!this.hasChanges()) {
            this.log('Nenhuma mudança detectada, pulando auto-save');
            this.scheduleNextSave();
            return;
        }

        // Aplicar debounce se há atividade recente
        const timeSinceActivity = Date.now() - this.state.lastActivity;
        if (timeSinceActivity < this.config.debounceDelay && this.state.isUserActive) {
            this.log('Atividade recente detectada, aplicando debounce');
            this.clearTimer('debounce');
            
            this.timers.debounce = setTimeout(() => {
                this.executeSave();
            }, this.config.debounceDelay);
            
            return;
        }

        this.executeSave();
    }

    /**
     * Executa o salvamento efetivamente
     */
    async executeSave() {
        try {
            this.log('Executando auto-save...');
            
            // Usar AsyncErrorHandler para operação segura
            const saveResult = await window.asyncErrorHandler.withTimeout(async () => {
                return this.callSaveCallback();
            }, 10000, `smartAutoSave_${Date.now()}`);
            
            if (saveResult !== false) {
                this.state.lastSave = Date.now();
                this.state.saveCount++;
                this.log(`Auto-save #${this.state.saveCount} executado com sucesso`);
                
                // Emitir evento de sucesso via EventBus
                if (window.eventBus) {
                    window.eventBus.emit('autosave:success', {
                        timestamp: new Date().toISOString(),
                        saveCount: this.state.saveCount,
                        interval: this.state.currentInterval,
                        isUserActive: this.state.isUserActive
                    });
                }
            } else {
                this.log('Auto-save cancelado pelo callback');
            }
        } catch (error) {
            console.error('[SMART AUTO-SAVE]: Erro durante salvamento:', error);
            
            // Usar AsyncErrorHandler para tratamento de erro
            if (window.asyncErrorHandler) {
                window.asyncErrorHandler.handleAsyncError(error, 'smartAutoSave', {
                    saveCount: this.state.saveCount,
                    interval: this.state.currentInterval,
                    isUserActive: this.state.isUserActive,
                    notifyUser: true,
                    fallback: null
                });
            }
        } finally {
            // Agendar próximo save
            this.scheduleNextSave();
        }
    }

    /**
     * Chama o callback de salvamento
     */
    callSaveCallback() {
        if (typeof this.config.saveCallback === 'function') {
            return this.config.saveCallback();
        } else if (typeof window.dataManager !== 'undefined' && window.dataManager.autoSave) {
            return window.dataManager.autoSave();
        } else {
            this.log('Nenhum callback de salvamento configurado');
            return false;
        }
    }

    /**
     * Verifica se há mudanças para salvar
     */
    hasChanges() {
        if (typeof this.config.hasChangesCallback === 'function') {
            return this.config.hasChangesCallback();
        } else if (typeof window.dataManager !== 'undefined' && window.dataManager.generateDataHash) {
            // Usar hash para detectar mudanças
            const currentHash = window.dataManager.generateDataHash();
            const lastHash = localStorage.getItem('lastAutoSaveHash');
            return currentHash !== lastHash;
        } else {
            // Assumir que sempre há mudanças se não há callback
            return true;
        }
    }

    /**
     * Força um auto-save imediato
     */
    forceSave() {
        this.log('Forçando auto-save imediato...');
        this.clearTimer('debounce');
        this.executeSave();
    }

    /**
     * Limpa todos os timers
     */
    clearTimers() {
        Object.keys(this.timers).forEach(key => {
            this.clearTimer(key);
        });
    }

    /**
     * Limpa um timer específico
     */
    clearTimer(timerName) {
        if (this.timers[timerName]) {
            clearTimeout(this.timers[timerName]);
            this.timers[timerName] = null;
        }
    }

    /**
     * Função de debounce utilitária
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Atualiza configurações
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('Configurações atualizadas:', newConfig);
        
        // Reiniciar se necessário
        if (this.state.isActive) {
            this.restart();
        }
    }

    /**
     * Obtém estatísticas do sistema
     */
    getStats() {
        return {
            isActive: this.state.isActive,
            isUserActive: this.state.isUserActive,
            saveCount: this.state.saveCount,
            lastActivity: new Date(this.state.lastActivity),
            lastSave: new Date(this.state.lastSave),
            currentInterval: this.state.currentInterval,
            timeSinceLastActivity: Date.now() - this.state.lastActivity,
            timeSinceLastSave: Date.now() - this.state.lastSave
        };
    }

    /**
     * Log com controle de debug
     */
    log(message, ...args) {
        if (this.config.debug) {
            console.log(`[SMART AUTO-SAVE]: ${message}`, ...args);
        }
    }

    /**
     * Cleanup ao destruir instância
     */
    destroy() {
        this.stop();
        
        // Remover event listeners
        const handleActivity = () => {}; // Placeholder
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, handleActivity);
        });
        
        this.clearTimer('activityCheck');
        this.log('Sistema de auto-save destruído');
    }
}

// Criar instância global
const smartAutoSave = new SmartAutoSave({
    debug: false, // Ativar para debugging
    baseInterval: 30000, // 30 segundos quando ativo
    inactiveInterval: 120000, // 2 minutos quando inativo
    inactivityThreshold: 60000, // 1 minuto para considerar inativo
    debounceDelay: 5000 // 5 segundos de debounce
});

// Disponibilizar globalmente
window.SmartAutoSave = SmartAutoSave;
window.smartAutoSave = smartAutoSave;

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartAutoSave, smartAutoSave };
}

// Log de inicialização
console.log('[SMART AUTO-SAVE]: Sistema de auto-save inteligente carregado');