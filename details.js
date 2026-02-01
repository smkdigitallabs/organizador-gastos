document.addEventListener('DOMContentLoaded', function() {
    const expensesList = document.getElementById('expensesList');
    const incomeList = document.getElementById('incomeList');
    const monthSelect = document.getElementById('month');
    const yearInput = document.getElementById('year');
    
    // Preenche o select de meses
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
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
    yearInput.value = currentDate.getFullYear();
    
    // Atualiza as listas quando o mês ou ano for alterado
    monthSelect.addEventListener('change', updateLists);
    yearInput.addEventListener('change', updateLists);
    
    // Carrega as listas inicialmente
    updateLists();
});

function updateLists() {
    const month = document.getElementById('month').value;
    const year = document.getElementById('year').value;
    
    // Recupera as transações do DataManager ou localStorage
    let expenses = [];
    let incomes = [];
    
    if (typeof dataManager !== 'undefined') {
        expenses = dataManager.getExpenses();
        incomes = dataManager.getIncomes();
    } else {
        expenses = JSON.parse(localStorage.getItem('expensesData') || '[]');
        incomes = JSON.parse(localStorage.getItem('incomeData') || '[]');
    }
    
    // Filtra as transações do mês selecionado
    const monthExpenses = filterTransactionsByMonth(expenses, month, year);
    const monthIncomes = filterTransactionsByMonth(incomes, month, year);
    
    // Atualiza as listas na interface
    displayTransactions('expensesList', monthExpenses);
    displayTransactions('incomeList', monthIncomes);
}

function filterTransactionsByMonth(transactions, month, year) {
    return transactions.filter(transaction => {
        const [y, m, d] = transaction.date.split('T')[0].split('-');
        return parseInt(m) === parseInt(month) && parseInt(y) === parseInt(year);
    });
}

function displayTransactions(listId, transactions) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    
    if (transactions.length === 0) {
        list.innerHTML = '<p class="no-transactions">Nenhuma transação encontrada</p>';
        return;
    }
    
    // Ordena as transações por data
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactions.forEach(transaction => {
        const [y, m, d] = transaction.date.split('T')[0].split('-');
        const formattedDate = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
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
                let allTransactions = [];

                if (typeof dataManager !== 'undefined') {
                    allTransactions = isExpense ? dataManager.getExpenses() : dataManager.getIncomes();
                } else {
                    allTransactions = isExpense 
                        ? JSON.parse(localStorage.getItem('expensesData') || '[]')
                        : JSON.parse(localStorage.getItem('incomeData') || '[]');
                }
                
                // Encontra e remove a transação
                // Usando uma estratégia mais robusta para encontrar a transação exata
                // Idealmente, as transações deveriam ter IDs únicos
                const updatedTransactions = allTransactions.filter(t => 
                    !(t.date === transaction.date && 
                      t.description === transaction.description && 
                      t.amount === transaction.amount && 
                      t.category === transaction.category));
                
                if (typeof dataManager !== 'undefined') {
                    if (isExpense) {
                        dataManager.saveExpenses(updatedTransactions);
                    } else {
                        dataManager.saveIncomes(updatedTransactions);
                    }
                } else {
                    if (isExpense) {
                        localStorage.setItem('expensesData', JSON.stringify(updatedTransactions));
                    } else {
                        localStorage.setItem('incomeData', JSON.stringify(updatedTransactions));
                    }
                }
                
                updateLists(); // Atualiza a exibição
                
                if (typeof showNotification === 'function') {
                    showNotification('Transação excluída com sucesso!', 'success');
                }
            }
        });
        
        list.appendChild(item);
    });
}
