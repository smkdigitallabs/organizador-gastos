
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

            // 1. Obter Connect Token do Backend
            const response = await fetch('/api/create-connect-token', { method: 'POST' });
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

            const response = await fetch('/api/sync-transactions', {
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
        let count = 0;
        
        transactions.forEach(tx => {
            // Evitar duplicatas (verificar se ID já existe)
            // Nota: O DataManager deve tratar isso, mas podemos pré-filtrar se necessário
            // O Pluggy retorna ID único por transação.
            
            // Mapear campos do Pluggy para nosso App
            const expense = {
                id: tx.id, // ID original do Pluggy
                date: tx.date.split('T')[0],
                description: tx.description,
                amount: Math.abs(tx.amount),
                category: tx.category || 'Outros',
                paymentMethod: tx.type === 'CREDIT' ? 'credito' : 'debito',
                status: 'pago',
                source: 'PLUGGY_SYNC',
                originalData: {
                    accountName: tx._accountName,
                    merchant: tx.merchant
                }
            };

            // Adicionar lógica de classificação inteligente aqui se necessário
            // Por enquanto, salva direto
            
            // Verificar duplicidade básica
            const exists = dataManager.getExpenses().some(e => e.id === expense.id);
            if (!exists) {
                dataManager.addExpense(expense);
                count++;
            }
        });

        if (count > 0) {
            showNotification(`${count} novas transações importadas!`, 'success');
        }
    }
}

export const bankSyncService = new BankSyncService();
