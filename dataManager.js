import { eventBus } from './eventBus.js';
import { safeStorage } from './safeStorage.js';
import { showNotification } from './notificationSystem.js';

// Sistema de persistência de dados
/**
 * Gerenciador de Dados - Versão Segura
 * Elimina dependências circulares usando EventBus
 * Implementa tratamento robusto de erros
 * @author Sistema de Debug Especializado
 * @version 2.0.0
 */
export class DataManager {
    constructor() {
        this.CURRENT_DATA_VERSION = '2.0';
        this.AUTO_SAVE_INTERVAL = 5000; // 5 segundos (será otimizado)
        this.lastDataHash = null;
        this.maxAutoSaveVersions = 20; // Default max versions
        
        // Verificar se SafeStorage está disponível
        if (!safeStorage) {
            console.error('DataManager: SafeStorage não encontrado. Funcionalidades limitadas.');
            this.useFallback = true;
        } else {
            this.useFallback = false;
        }
        
        // Inicializar sistema de eventos
        this.initializeEventSystem();
        
        // Configurar auto-save e carregar dados
        // this.setupAutoSave(); // Auto-save agora é gerenciado externamente pelo SmartAutoSave
        this.loadInitialData();
    }

    /**
     * Inicializa sistema de eventos para comunicação segura
     */
    initializeEventSystem() {
        try {
            // Verificar se EventBus está disponível
            if (!eventBus) {
                console.warn('DataManager: EventBus não disponível, usando modo compatibilidade');
                return;
            }

            // Registrar listeners para eventos críticos
            eventBus.on('data:save:request', () => {
                this.autoSave();
            }, { id: 'datamanager_autosave' });

            eventBus.on('data:export:request', () => {
                this.exportBackup();
            }, { id: 'datamanager_export' });

            eventBus.on('data:clear:request', () => {
                this.clearAllData();
            }, { id: 'datamanager_clear' });

            eventBus.on('ui:dashboard:update:request', () => {
                // Emitir evento para atualizar dashboard sem dependência circular
                eventBus.emit('ui:dashboard:update', this.getAllData());
            }, { id: 'datamanager_dashboard' });

            console.log('[DATA MANAGER]: Sistema de eventos inicializado');
            
        } catch (error) {
            console.error('[DATA MANAGER]: Erro ao inicializar eventos:', error);
        }
    }

    /**
     * Obtém todos os dados do sistema de forma segura
     */
    getAllData() {
        try {
            return {
                expensesData: this.getExpenses(),
                incomeData: this.getIncomes(),
                cards: this.getCards()
            };
        } catch (error) {
            console.error('[DATA MANAGER]: Erro ao obter dados:', error);
            return { expensesData: [], incomeData: [], cards: [] };
        }
    }

    // Métodos de acesso granular (Repository Pattern)
    getExpenses() {
        return this.useFallback ? 
            JSON.parse(localStorage.getItem('expensesData') || '[]') : 
            safeStorage.getJSON('expensesData', []);
    }

    saveExpenses(expenses) {
        if (this.useFallback) {
            localStorage.setItem('expensesData', JSON.stringify(expenses));
        } else {
            safeStorage.setJSON('expensesData', expenses);
        }
        this.notifyDataChange('expenses');
    }

    getIncomes() {
        return this.useFallback ? 
            JSON.parse(localStorage.getItem('incomeData') || '[]') : 
            safeStorage.getJSON('incomeData', []);
    }

    saveIncomes(incomes) {
        if (this.useFallback) {
            localStorage.setItem('incomeData', JSON.stringify(incomes));
        } else {
            safeStorage.setJSON('incomeData', incomes);
        }
        this.notifyDataChange('income');
    }

    getCards() {
        return this.useFallback ? 
            JSON.parse(localStorage.getItem('cards') || '[]') : 
            safeStorage.getJSON('cards', []);
    }

    saveCards(cards) {
        if (this.useFallback) {
            localStorage.setItem('cards', JSON.stringify(cards));
        } else {
            safeStorage.setJSON('cards', cards);
        }
        this.notifyDataChange('cards');
    }

    getExpenseCategories() {
        return this.useFallback ? 
            JSON.parse(localStorage.getItem('expense-categories') || '[]') : 
            safeStorage.getJSON('expense-categories', []);
    }

    saveExpenseCategories(categories) {
        if (this.useFallback) {
            localStorage.setItem('expense-categories', JSON.stringify(categories));
        } else {
            safeStorage.setJSON('expense-categories', categories);
        }
        this.notifyDataChange('expense-categories');
    }

    getIncomeCategories() {
        return this.useFallback ? 
            JSON.parse(localStorage.getItem('income-categories') || '[]') : 
            safeStorage.getJSON('income-categories', []);
    }

    saveIncomeCategories(categories) {
        if (this.useFallback) {
            localStorage.setItem('income-categories', JSON.stringify(categories));
        } else {
            safeStorage.setJSON('income-categories', categories);
        }
        this.notifyDataChange('income-categories');
    }

    // Helper methods for adding data
    addExpense(expense) {
        const expenses = this.getExpenses();
        if (!expense.id) {
            expense.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        expenses.push(expense);
        this.saveExpenses(expenses);
        return expense;
    }

    addIncome(income) {
        const incomes = this.getIncomes();
        if (!income.id) {
            income.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        incomes.push(income);
        this.saveIncomes(incomes);
        return income;
    }

    addCard(card) {
        const cards = this.getCards();
        if (!card.id) {
            card.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        cards.push(card);
        this.saveCards(cards);
        return card;
    }

    notifyDataChange(dataType) {
        if (eventBus) {
            eventBus.emit('data:updated', { type: dataType });
            // Emitir evento para atualizar dashboard
            eventBus.emit('ui:dashboard:update:request');
        }
        // Trigger auto-save para persistir metadados e atualizar hash
        // Usamos setTimeout para não bloquear a thread principal
        setTimeout(() => this.autoSave(), 100);
    }

    // Salvar dados em arquivo
    saveToFile() {
        try {
            const data = {
                expensesData: this.useFallback ? 
                    JSON.parse(localStorage.getItem('expensesData') || '[]') : 
                    safeStorage.getJSON('expensesData', []),
                incomeData: this.useFallback ? 
                    JSON.parse(localStorage.getItem('incomeData') || '[]') : 
                    safeStorage.getJSON('incomeData', []),
                cards: this.useFallback ? 
                    JSON.parse(localStorage.getItem('cards') || '[]') : 
                    safeStorage.getJSON('cards', []),
                categories: {
                    income: this.useFallback ? 
                        JSON.parse(localStorage.getItem('income-categories') || '[]') : 
                        safeStorage.getJSON('income-categories', []),
                    expense: this.useFallback ? 
                        JSON.parse(localStorage.getItem('expense-categories') || '[]') : 
                        safeStorage.getJSON('expense-categories', [])
                },
                achievements: this.useFallback ? 
                    JSON.parse(localStorage.getItem('achievements') || '[]') : 
                    safeStorage.getJSON('achievements', []),
                monthlyGoal: this.useFallback ? 
                    localStorage.getItem('monthlyExpenseGoal') : 
                    safeStorage.getItem('monthlyExpenseGoal'),
                lastSaved: new Date().toISOString(),
                version: this.CURRENT_DATA_VERSION
            };
        
            const dataStr = this.useFallback ? 
                JSON.stringify(data, null, 2) : 
                safeStorage.stringifyJSON(data, '{}');
            
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            const dateString = `${day}-${month}-${year}`;
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `Backup_data_${dateString}.json`;
            link.click();
            
            console.log('Dados salvos com sucesso!');
            showNotification('Dados salvos com sucesso!', 'success');
        } catch (error) {
            console.error('DataManager.saveToFile: Erro ao salvar arquivo:', error);
            showNotification('Erro ao salvar arquivo: ' + error.message, 'error');
        }
    }

    // Carregar dados de arquivo
    loadFromFileInput(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                const error = new Error('Nenhum arquivo fornecido');
                showNotification('Erro: Nenhum arquivo selecionado', 'error');
                reject(error);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = this.useFallback ? 
                        JSON.parse(e.target.result) : 
                        safeStorage.parseJSON(e.target.result, null);
                    
                    if (!data) {
                        throw new Error('Arquivo JSON inválido ou corrompido');
                    }
                    
                    // Validar estrutura dos dados
                    if (this.validateDataStructure(data)) {
                        // Restaurar dados no localStorage usando SafeStorage
                        const success = this.restoreDataSafely(data);
                        
                        if (success) {
                            showNotification('Dados carregados com sucesso!', 'success');
                            setTimeout(() => window.location.reload(), 1000);
                            resolve(data);
                        } else {
                            throw new Error('Falha ao restaurar dados no storage');
                        }
                    } else {
                        throw new Error('Estrutura de dados inválida');
                    }
                } catch (error) {
                    console.error('DataManager.loadFromFileInput: Erro ao carregar arquivo:', error);
                    showNotification('Erro ao carregar arquivo: ' + error.message, 'error');
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                const error = new Error('Erro ao ler arquivo');
                showNotification('Erro ao ler arquivo', 'error');
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Restaura dados de forma segura usando SafeStorage
     * @private
     */
    restoreDataSafely(data) {
        try {
            const operations = [
                () => this.useFallback ? 
                    localStorage.setItem('expensesData', JSON.stringify(data.expensesData || [])) :
                    safeStorage.setJSON('expensesData', data.expensesData || []),
                () => this.useFallback ? 
                    localStorage.setItem('incomeData', JSON.stringify(data.incomeData || [])) :
                    safeStorage.setJSON('incomeData', data.incomeData || []),
                () => this.useFallback ? 
                    localStorage.setItem('cards', JSON.stringify(data.cards || [])) :
                    safeStorage.setJSON('cards', data.cards || []),
                () => this.useFallback ? 
                    localStorage.setItem('income-categories', JSON.stringify(data.categories?.income || [])) :
                    safeStorage.setJSON('income-categories', data.categories?.income || []),
                () => this.useFallback ? 
                    localStorage.setItem('expense-categories', JSON.stringify(data.categories?.expense || [])) :
                    safeStorage.setJSON('expense-categories', data.categories?.expense || []),
                () => this.useFallback ? 
                    localStorage.setItem('achievements', JSON.stringify(data.achievements || [])) :
                    safeStorage.setJSON('achievements', data.achievements || [])
            ];

            // Executar operações e verificar sucesso
            let successCount = 0;
            operations.forEach((operation, index) => {
                try {
                    const result = operation();
                    if (result !== false) successCount++;
                } catch (error) {
                    console.error(`DataManager: Erro na operação ${index}:`, error);
                }
            });

            // Salvar meta dados
            if (data.monthlyGoal) {
                try {
                    if (this.useFallback) {
                        localStorage.setItem('monthlyExpenseGoal', data.monthlyGoal);
                    } else {
                        safeStorage.setItem('monthlyExpenseGoal', data.monthlyGoal);
                    }
                    successCount++;
                } catch (error) {
                    console.error('DataManager: Erro ao salvar meta mensal:', error);
                }
            }

            return successCount > 0; // Sucesso se pelo menos uma operação funcionou
        } catch (error) {
            console.error('DataManager.restoreDataSafely: Erro geral:', error);
            return false;
        }
    }

    // Validar estrutura dos dados
    validateDataStructure(data) {
        return data && 
               Array.isArray(data.expensesData) && 
               Array.isArray(data.incomeData) && 
               Array.isArray(data.cards);
    }

    // Carregar dados iniciais e aplicar migrações se necessário
    loadInitialData() {
        let storedData = {};
        try {
            storedData = JSON.parse(localStorage.getItem('appData')) || {};
        } catch (e) {
            console.error("Erro ao parsear dados do localStorage, iniciando com dados vazios.", e);
            storedData = {};
        }

        const storedVersion = storedData.version || '1.0'; // Assume 1.0 se não houver versão

        // Aplicar migrações se a versão armazenada for mais antiga
        if (storedVersion !== this.CURRENT_DATA_VERSION) {
            console.log(`Migrando dados da versão ${storedVersion} para ${this.CURRENT_DATA_VERSION}`);
            storedData = this.migrateData(storedData, storedVersion, this.CURRENT_DATA_VERSION);
            // Salvar os dados migrados de volta no localStorage
            localStorage.setItem('appData', JSON.stringify(storedData));
        }

        // Carregar os dados para os respectivos localStorage.items
        localStorage.setItem('expensesData', JSON.stringify(storedData.expensesData || []));
        localStorage.setItem('incomeData', JSON.stringify(storedData.incomeData || []));
        localStorage.setItem('cards', JSON.stringify(storedData.cards || []));
        localStorage.setItem('income-categories', JSON.stringify(storedData.categories?.income || []));
        localStorage.setItem('expense-categories', JSON.stringify(storedData.categories?.expense || []));
        localStorage.setItem('achievements', JSON.stringify(storedData.achievements || []));
        if (storedData.monthlyGoal) {
            localStorage.setItem('monthlyExpenseGoal', storedData.monthlyGoal);
        }
    }

    // Função de migração de dados (exemplo)
    migrateData(data, fromVersion, toVersion) {
        let migratedData = { ...data };

        // Exemplo de migração de 1.0 para 1.1:
        if (fromVersion === '1.0' && toVersion === '1.1') {
            if (migratedData.expensesData) {
                migratedData.expensesData = migratedData.expensesData.map(expense => {
                    if (!expense.expenseType) {
                        expense.expenseType = 'variavel'; 
                    }
                    return expense;
                });
            }
        }

        migratedData.version = toVersion; // Atualiza a versão dos dados migrados
        return migratedData;
    }

    // Gerar hash dos dados para detectar mudanças
    generateDataHash() {
        try {
            const currentData = {
                expensesData: this.useFallback ? 
                    JSON.parse(localStorage.getItem('expensesData') || '[]') : 
                    safeStorage.getJSON('expensesData', []),
                incomeData: this.useFallback ? 
                    JSON.parse(localStorage.getItem('incomeData') || '[]') : 
                    safeStorage.getJSON('incomeData', []),
                cards: this.useFallback ? 
                    JSON.parse(localStorage.getItem('cards') || '[]') : 
                    safeStorage.getJSON('cards', []),
                categories: {
                    income: this.useFallback ? 
                        JSON.parse(localStorage.getItem('income-categories') || '[]') : 
                        safeStorage.getJSON('income-categories', []),
                    expense: this.useFallback ? 
                        JSON.parse(localStorage.getItem('expense-categories') || '[]') : 
                        safeStorage.getJSON('expense-categories', [])
                },
                achievements: this.useFallback ? 
                    JSON.parse(localStorage.getItem('achievements') || '[]') : 
                    safeStorage.getJSON('achievements', []),
                monthlyGoal: this.useFallback ? 
                    localStorage.getItem('monthlyExpenseGoal') : 
                    safeStorage.getItem('monthlyExpenseGoal'),
                timestamp: Date.now()
            };
            
            const dataString = this.useFallback ? 
                JSON.stringify(currentData) : 
                safeStorage.stringifyJSON(currentData);
            
            // Hash simples mas eficiente
            let hash = 0;
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Converter para 32bit integer
            }
            return hash.toString();
        } catch (error) {
            console.error('DataManager.generateDataHash: Erro ao gerar hash:', error);
            return Date.now().toString(); // Fallback usando timestamp
        }
    }

    // Auto-save silencioso (apenas se houver mudanças)
    /**
     * Auto-save inteligente com tratamento robusto de erros
     */
    autoSave() {
        try {
            const currentHash = this.generateDataHash();
            
            // Verificar se houve mudanças nos dados
            if (this.lastDataHash === null || this.lastDataHash !== currentHash) {
                
                // Obter dados de forma segura
                const data = this.getAllData();
                
                // Adicionar metadados de controle
                const saveData = {
                    ...data,
                    categories: {
                        income: this.useFallback ? 
                            JSON.parse(localStorage.getItem('income-categories') || '[]') : 
                            safeStorage.getJSON('income-categories', []),
                        expense: this.useFallback ? 
                            JSON.parse(localStorage.getItem('expense-categories') || '[]') : 
                            safeStorage.getJSON('expense-categories', [])
                    },
                    achievements: this.useFallback ? 
                        JSON.parse(localStorage.getItem('achievements') || '[]') : 
                        safeStorage.getJSON('achievements', []),
                    monthlyGoal: this.useFallback ? 
                        localStorage.getItem('monthlyExpenseGoal') : 
                        safeStorage.getItem('monthlyExpenseGoal'),
                    timestamp: new Date().toISOString(),
                    hash: currentHash,
                    version: this.CURRENT_DATA_VERSION
                };
                
                // Salvar versão no histórico de auto-save
                this.saveAutoSaveVersion(saveData);
                
                // Salvar usando SafeStorage se disponível
                if (!this.useFallback) {
                    safeStorage.setItem('lastAutoSave', saveData.timestamp);
                    safeStorage.setJSON('appData', saveData);
                } else {
                    localStorage.setItem('lastAutoSave', saveData.timestamp);
                    localStorage.setItem('appData', JSON.stringify(saveData));
                }
                
                this.lastDataHash = currentHash;
                
                // Emitir evento de sucesso
                if (eventBus) {
                    eventBus.emit('data:autosave:success', {
                        timestamp: saveData.timestamp,
                        hash: currentHash
                    });
                }
                
                console.log('[DATA MANAGER]: Auto-save realizado (dados modificados):', saveData.timestamp);
                
            } else {
                console.log('[DATA MANAGER]: Auto-save ignorado (sem mudanças nos dados)');
            }
            
        } catch (error) {
            console.error('[DATA MANAGER]: Erro crítico durante auto-save:', error);
            
            // Emitir evento de erro
            if (eventBus) {
                eventBus.emit('system:error', {
                    type: 'autosave_critical_error',
                    message: 'Falha crítica no auto-save',
                    error: error.message,
                    stack: error.stack
                });
            }
            
            // Tentar notificar o usuário se possível
            showNotification('Erro no auto-save. Dados podem não estar sendo salvos automaticamente.', 'error');
        }
    }

    // Salvar versão do auto-save
    saveAutoSaveVersion(data) {
        let autoSaveHistory = JSON.parse(localStorage.getItem('autoSaveHistory') || '[]');
        
        // Adicionar nova versão
        autoSaveHistory.unshift({
            id: Date.now(),
            timestamp: data.timestamp,
            data: data,
            hash: data.hash
        });
        
        // Manter apenas as últimas versões
        if (autoSaveHistory.length > this.maxAutoSaveVersions) {
            autoSaveHistory = autoSaveHistory.slice(0, this.maxAutoSaveVersions);
        }
        
        localStorage.setItem('autoSaveHistory', JSON.stringify(autoSaveHistory));
    }

    // Obter versões do auto-save
    getAutoSaveVersions() {
        return JSON.parse(localStorage.getItem('autoSaveHistory') || '[]');
    }

    // Restaurar versão específica do auto-save
    restoreAutoSaveVersion(versionId) {
        const autoSaveHistory = this.getAutoSaveVersions();
        const version = autoSaveHistory.find(v => v.id === versionId);
        
        if (version) {
            const data = version.data;
            
            // Restaurar dados no localStorage
            localStorage.setItem('expensesData', JSON.stringify(data.expensesData || []));
            localStorage.setItem('incomeData', JSON.stringify(data.incomeData || []));
            localStorage.setItem('cards', JSON.stringify(data.cards || []));
            localStorage.setItem('income-categories', JSON.stringify(data.categories?.income || []));
            localStorage.setItem('expense-categories', JSON.stringify(data.categories?.expense || []));
            localStorage.setItem('achievements', JSON.stringify(data.achievements || []));
            if (data.monthlyGoal) {
                localStorage.setItem('monthlyExpenseGoal', data.monthlyGoal);
            }
            // Restaurar a chave 'appData' também
            localStorage.setItem('appData', JSON.stringify(data));
            
            showNotification('Dados restaurados com sucesso!', 'success');
            
            // Recarregar a página para atualizar a interface
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
            return true;
        }
        
        showNotification('Versão não encontrada!', 'error');
        return false;
    }

    // Limpar histórico de auto-save
    clearAutoSaveHistory() {
        localStorage.removeItem('autoSaveHistory');
        showNotification('Histórico de auto-save limpo!', 'info');
    }

    // Exportar dados para backup
    exportBackup() {
        this.saveToFile();
    }

    // Limpar todos os dados
    clearAllData() {
        // Primeira pergunta: se quer fazer backup
        const wantBackup = confirm('Deseja criar um backup antes de apagar todos os dados?\n\nClique OK para SIM (criar backup)\nClique Cancelar para NÃO (prosseguir sem backup)');
        
        if (wantBackup) {
            // Se clicou OK (quer backup), seguir processo já implementado
            if (confirm('Tem certeza que deseja limpar todos os dados? Um backup será criado automaticamente antes da limpeza.')) {
                // Criar backup antes de limpar
                this.exportBackup();
                
                // Aguardar um momento para o download
                setTimeout(() => {
                    localStorage.clear();
                    showNotification('Dados limpos! Backup salvo na pasta Downloads.', 'info');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }, 1000);
            }
        } else {
            // Se clicou Cancelar (não quer backup), avisar sobre auto-save
            if (confirm('Tem certeza que deseja apagar todos os dados?\n\nEste processo apagará todos os dados e será possível recuperar apenas algumas modificações anteriores pelo auto-save.\n\nClique OK para CONFIRMAR a exclusão\nClique Cancelar para CANCELAR a operação')) {
                localStorage.clear();
                showNotification('Dados limpos! Algumas modificações podem ser recuperadas pelo histórico de auto-save.', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }
}

export const dataManager = new DataManager();
