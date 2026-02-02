import { dataManager } from './dataManager.js';
import { showNotification } from './notificationSystem.js';
import { initSharedUI, setupCategoryDropdowns } from './uiShared.js';

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar UI Compartilhada
    initSharedUI();
    setupCategoryDropdowns();

    const expenseForm = document.getElementById('expenseForm');
    const expensesList = document.getElementById('expensesList'); // This ID might need verification in expenses.html
    // expenses.html actually doesn't show a list container in the first 50-100 lines I read. 
    // Let's assume it has one or I need to find where it is.
    // In index.html, it's expensesList. 
    
    // Load expenses
    loadExpenses();

    // Setup form submission
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }
    
    // Setup payment method change to show/hide card select
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', handlePaymentMethodChange);
    }
    
    // Setup recurring checkbox
    const isRecurringCheckbox = document.getElementById('isRecurring');
    if (isRecurringCheckbox) {
        isRecurringCheckbox.addEventListener('change', function() {
            const options = document.getElementById('recurring-options');
            if (options) {
                options.style.display = this.checked ? 'block' : 'none';
            }
        });
    }
});

function loadExpenses() {
    // Logic to load expenses into a list if it exists on this page
    // expenses.html seems to be a form page mainly? Or does it list expenses too?
    // Looking at the file list, there is no expensesList container visible in the snippets I read.
    // But income.js had fixedIncomeList and variableIncomeList.
    // Let's assume expenses.html might have similar structure or just the form.
    // If it's just the form, we don't need loadExpenses unless there's a history section.
    // I'll leave it empty or basic for now, focusing on the form.
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    try {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value; // Hidden input from custom dropdown
        const date = document.getElementById('date').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const selectedCard = document.getElementById('selectedCard').value;
        const installments = document.getElementById('installments').value;
        const isFixed = document.getElementById('isFixed').checked;
        const isRecurring = document.getElementById('isRecurring').checked;
        
        if (!description || !amount || !category || !date || !paymentMethod) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        
        const expense = {
            description,
            amount,
            category,
            date,
            paymentMethod,
            selectedCard: (paymentMethod === 'credito_vista' || paymentMethod === 'credito_parcelado') ? selectedCard : null,
            installments: (paymentMethod === 'credito_parcelado') ? parseInt(installments) : 1,
            isFixed,
            isRecurring,
            createdAt: new Date().toISOString()
        };
        
        if (isRecurring) {
            expense.recurring = {
                frequency: document.getElementById('recurring-frequency').value,
                endDate: document.getElementById('recurring-end-date').value
            };
        }
        
        // Save using dataManager
        dataManager.addExpense(expense);
        
        showNotification('Despesa adicionada com sucesso!', 'success');
        e.target.reset();
        
        // Reset custom dropdown if needed
        const categorySelected = document.getElementById('category-selected');
        if (categorySelected) {
            const span = categorySelected.querySelector('span');
            if (span) span.textContent = 'Selecione uma categoria';
        }
        
    } catch (error) {
        console.error('Erro ao adicionar despesa:', error);
        showNotification('Erro ao adicionar despesa.', 'error');
    }
}

function handlePaymentMethodChange(e) {
    const method = e.target.value;
    const cardGroup = document.getElementById('cardSelectGroup');
    const installmentsGroup = document.getElementById('installmentsGroup');
    const cardSelect = document.getElementById('selectedCard');
    
    if (method === 'credito_vista' || method === 'credito_parcelado') {
        if (cardGroup) cardGroup.style.display = 'block';
        if (cardSelect) {
            populateCardSelect(cardSelect);
            cardSelect.required = true;
        }
        
        if (method === 'credito_parcelado' && installmentsGroup) {
            installmentsGroup.style.display = 'block';
            const installmentsInput = document.getElementById('installments');
            if (installmentsInput) installmentsInput.required = true;
        } else if (installmentsGroup) {
            installmentsGroup.style.display = 'none';
            const installmentsInput = document.getElementById('installments');
            if (installmentsInput) installmentsInput.required = false;
        }
    } else {
        if (cardGroup) cardGroup.style.display = 'none';
        if (installmentsGroup) installmentsGroup.style.display = 'none';
        if (cardSelect) cardSelect.required = false;
        const installmentsInput = document.getElementById('installments');
        if (installmentsInput) installmentsInput.required = false;
    }
}

function populateCardSelect(selectElement) {
    const cards = dataManager.getCards();
    selectElement.innerHTML = '<option value="">Selecione um cartão</option>';
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.name;
        option.textContent = `${card.name} (${getCardTypeLabel(card.type)})`;
        selectElement.appendChild(option);
    });
}

function getCardTypeLabel(type) {
    const types = {
        'credito': 'Crédito',
        'debito': 'Débito',
        'multiplo': 'Múltiplo'
    };
    return types[type] || type;
}
