
import { dataManager } from './dataManager.js';
import { initSharedUI } from './uiShared.js';
import { showNotification } from './notificationSystem.js';
import { cloudSync } from './cloudSync.js';
import { smartAutoSave } from './smartAutoSave.js';

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar UI Compartilhada
    initSharedUI();

    const expensesList = document.getElementById('expensesList');
    const incomeList = document.getElementById('incomeList');
    const monthSelect = document.getElementById('month');
    const yearInput = document.getElementById('year');
    
    // Preenche o select de meses
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    if (monthSelect) {
        monthSelect.innerHTML = ''; // Limpa as opções existentes
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });
        
        // Define o mês e ano atual
        const currentDate = new Date();
        monthSelect.value = currentDate.getMonth() + 1;
        if (yearInput) yearInput.value = currentDate.getFullYear();
        
        // Atualiza as listas quando o mês ou ano for alterado
        monthSelect.addEventListener('change', updateLists);
        if (yearInput) yearInput.addEventListener('change', updateLists);
        
        // Carrega as listas inicialmente
        updateLists();
    }
});

function updateLists() {
    const monthSelect = document.getElementById('month');
    const yearInput = document.getElementById('year');
    
    if (!monthSelect || !yearInput) return;

    const month = monthSelect.value;
    const year = yearInput.value;
    
    // Recupera as transações do DataManager
    // Como importamos dataManager, não precisamos de verificações de existência
    let expenses = dataManager.getExpenses();
    let incomes = dataManager.getIncomes();
    
    // Filtra as transações do mês selecionado
    const monthExpenses = filterTransactionsByMonth(expenses, month, year);
    const monthIncomes = filterTransactionsByMonth(incomes, month, year);
    
    // Atualiza as listas na interface
    displayTransactions('expensesList', monthExpenses);
    displayTransactions('incomeList', monthIncomes);
}

function filterTransactionsByMonth(transactions, month, year) {
    if (!transactions || !Array.isArray(transactions)) return [];
    
    return transactions.filter(transaction => {
        if (!transaction.date) return false;
        const [y, m, d] = transaction.date.split('T')[0].split('-');
        return parseInt(m) === parseInt(month) && parseInt(y) === parseInt(year);
    });
}

function displayTransactions(listId, transactions) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    list.innerHTML = '';
    
    if (transactions.length === 0) {
        list.innerHTML = '<p class="no-transactions">Nenhuma transação encontrada</p>';
        return;
    }
    
    // Ordena as transações por data (mais recente primeiro)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactions.forEach(transaction => {
        const [y, m, d] = transaction.date.split('T')[0].split('-');
        const formattedDate = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
        
        // Formatar valor
        const amount = parseFloat(transaction.amount)
            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        // Formatar informações de pagamento
        let paymentInfo = '';
        if (transaction.paymentMethod) {
            const paymentMethods = {
                'dinheiro': 'Dinheiro',
                'pix': 'PIX',
                'debito': 'Débito',
                'credito_vista': 'Crédito à Vista',
                'credito_parcelado': 'Crédito Parcelado'
            };
            paymentInfo = paymentMethods[transaction.paymentMethod] || transaction.paymentMethod;
        }
        
        if (transaction.selectedCard) {
            paymentInfo += ` - Cartão: ${transaction.selectedCard}`;
        }
        
        if (transaction.installments && transaction.installments > 1) {
            paymentInfo += ` (${transaction.installments}x)`;
        }
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'transaction-date';
        dateSpan.textContent = formattedDate;
        
        const descSpan = document.createElement('span');
        descSpan.className = 'transaction-description';
        descSpan.textContent = transaction.description;
        
        const paymentSpan = document.createElement('span');
        paymentSpan.className = 'transaction-payment';
        paymentSpan.textContent = paymentInfo;
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'transaction-amount';
        amountSpan.textContent = amount;
        
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash delete-transaction';
        deleteIcon.title = 'Excluir';
        
        item.appendChild(dateSpan);
        item.appendChild(descSpan);
        item.appendChild(paymentSpan);
        item.appendChild(amountSpan);
        item.appendChild(deleteIcon);

        // Adiciona o evento de clique no botão de exclusão
        deleteIcon.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir esta transação?')) {
                const isExpense = listId === 'expensesList';
                let allTransactions = isExpense ? dataManager.getExpenses() : dataManager.getIncomes();
                
                // Encontra e remove a transação
                // Idealmente, deveríamos usar IDs únicos. Como não temos certeza se todos têm ID,
                // usamos uma combinação de campos ou ID se existir.
                // dataManager deve ter suporte a delete se tiver ID.
                
                let updatedTransactions;
                if (transaction.id) {
                    updatedTransactions = allTransactions.filter(t => t.id !== transaction.id);
                } else {
                    // Fallback para comparação por campos
                    updatedTransactions = allTransactions.filter(t => 
                        !(t.date === transaction.date && 
                          t.description === transaction.description && 
                          t.amount === transaction.amount && 
                          t.category === transaction.category));
                }
                
                if (isExpense) {
                    dataManager.saveExpenses(updatedTransactions);
                } else {
                    dataManager.saveIncomes(updatedTransactions);
                }
                
                updateLists(); // Atualiza a exibição
                
                showNotification('Transação excluída com sucesso!', 'success');
            }
        });
        
        list.appendChild(item);
    });
}
