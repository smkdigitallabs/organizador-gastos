
import { dataManager } from './dataManager.js';
import { showNotification } from './notificationSystem.js';

/**
 * Serviço de Integração Bancária (Pluggy.ai)
 * Gerencia a conexão com bancos via Open Finance e sincronização de transações.
 */
export class BankSyncService {
    constructor() {
        this.provider = 'PLUGGY';
        this.isConnected = false;
        this.connectedItemIds = this.loadConnectedItems();
    }

    loadConnectedItems() {
        const stored = localStorage.getItem(dataManager.getStorageKey('connected_bank_items'));
        return stored ? JSON.parse(stored) : [];
    }

    saveConnectedItems(items) {
        this.connectedItemIds = items;
        localStorage.setItem(dataManager.getStorageKey('connected_bank_items'), JSON.stringify(items));
    }

    /**
     * Inicia o fluxo de conexão bancária (Pluggy Connect Widget)
     */
    async startConnectionFlow() {
        try {
            showNotification('Iniciando conexão segura com Pluggy...', 'info');

            // Determine API Base URL
            const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            const API_BASE_URL = isLocal ? 'https://organizador-de-gastos.vercel.app' : '';

            // 1. Obter Connect Token do Backend
            const response = await fetch(`${API_BASE_URL}/api/create-connect-token`, { method: 'POST' });
            if (!response.ok) throw new Error('Falha ao gerar token de conexão');
            
            const { accessToken } = await response.json();

            // 2. Inicializar Widget
            if (!window.PluggyConnect) {
                throw new Error('Widget do Pluggy não carregado. Verifique sua conexão.');
            }

            const pluggyConnect = new window.PluggyConnect({
                accessToken,
                onSuccess: (itemData) => {
                    console.log('Conexão realizada com sucesso:', itemData);
                    this.handleConnectionSuccess(itemData);
                },
                onError: (error) => {
                    console.error('Erro no Widget Pluggy:', error);
                    showNotification('Erro na conexão bancária.', 'error');
                },
                onClose: () => {
                    console.log('Widget fechado');
                }
            });

            pluggyConnect.init();
            pluggyConnect.open();

        } catch (error) {
            console.error('Erro na conexão bancária:', error);
            showNotification('Erro ao iniciar conexão: ' + error.message, 'error');
        }
    }

    handleConnectionSuccess(itemData) {
        const { item } = itemData;
        
        // Salvar ID da conexão
        if (!this.connectedItemIds.includes(item.id)) {
            this.connectedItemIds.push(item.id);
            this.saveConnectedItems(this.connectedItemIds);
        }

        this.isConnected = true;
        showNotification(`Banco ${item.connector.name} conectado! Sincronizando...`, 'success');
        
        // Sincronizar imediatamente
        this.syncItem(item.id);
    }

    /**
     * Sincroniza todas as contas conectadas
     */
    async syncAll() {
        for (const itemId of this.connectedItemIds) {
            await this.syncItem(itemId);
        }
    }

    /**
     * Busca transações de uma conexão específica via Backend
     */
    async syncItem(itemId) {
        try {
            // Obter token de autenticação (Clerk)
            if (!window.Clerk || !window.Clerk.session) {
                console.warn('Sync ignorado: usuário não logado');
                return;
            }
            const token = await window.Clerk.session.getToken();

            showNotification('Sincronizando transações...', 'info');

            // Determine API Base URL
            const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            const API_BASE_URL = isLocal ? 'https://organizador-de-gastos.vercel.app' : '';

            const response = await fetch(`${API_BASE_URL}/api/sync-transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itemId })
            });

            if (!response.ok) throw new Error('Falha na sincronização');

            const { transactions } = await response.json();
            
            if (transactions && transactions.length > 0) {
                this.processTransactions(transactions);
            } else {
                showNotification('Nenhuma transação nova encontrada.', 'info');
            }

        } catch (error) {
            console.error('Erro na sincronização:', error);
            showNotification('Erro ao sincronizar transações.', 'error');
        }
    }

    /**
     * Processa e salva as transações no DataManager
     */
    processTransactions(transactions) {
        let expenseCount = 0;
        let incomeCount = 0;
        
        transactions.forEach(tx => {
            // tx.type pode ser 'DEBIT' (saída) ou 'CREDIT' (entrada)
            // Se o tipo estiver presente, usamos ele. Caso contrário, tentamos inferir pelo sinal do amount original.
            let isIncome = false;
            
            if (tx.type) {
                isIncome = tx.type === 'CREDIT';
            } else if (tx.amount !== undefined) {
                isIncome = tx.amount > 0;
            }

            const absAmount = Math.abs(tx.amount);
            
            // Mapear campos para o formato do App
            const normalizedTx = {
                id: tx.id || (Date.now().toString(36) + Math.random().toString(36).substr(2)),
                date: tx.date.split('T')[0],
                description: tx.description,
                amount: absAmount,
                category: tx.category || 'Outros',
                paymentMethod: isIncome ? 'dinheiro' : (tx.type === 'CREDIT_CARD' ? 'credito_vista' : 'debito'),
                status: 'pago',
                source: tx.source || 'PLUGGY_SYNC',
                originalData: tx.originalData || {
                    accountName: tx._accountName,
                    merchant: tx.merchant
                }
            };

            // Se for do Pluggy e for débito, geralmente é da conta corrente (débito)
            // Se for do Pluggy e for crédito (em um contexto de despesa), pode ser estorno ou cartão
            // Mas o Pluggy separa por tipo de conta. Por enquanto, simplificamos.

            if (isIncome) {
                // Verificar duplicidade
                const exists = dataManager.getIncomes().some(i => i.id === normalizedTx.id);
                if (!exists) {
                    dataManager.addIncome(normalizedTx);
                    incomeCount++;
                }
            } else {
                // Verificar duplicidade
                const exists = dataManager.getExpenses().some(e => e.id === normalizedTx.id);
                if (!exists) {
                    dataManager.addExpense(normalizedTx);
                    expenseCount++;
                }
            }
        });

        if (expenseCount > 0 || incomeCount > 0) {
            let msg = '';
            if (expenseCount > 0) msg += `${expenseCount} despesas `;
            if (incomeCount > 0) msg += `${msg ? 'e ' : ''}${incomeCount} receitas `;
            showNotification(`${msg}importadas com sucesso!`, 'success');
        } else {
            showNotification('Nenhuma transação nova para importar.', 'info');
        }
    }
}

export const bankSyncService = new BankSyncService();
