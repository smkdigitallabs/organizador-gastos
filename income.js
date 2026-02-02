import { dataManager } from './dataManager.js';
import { showNotification } from './notificationSystem.js';
import { initSharedUI, setupCategoryDropdowns } from './uiShared.js';

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar UI Compartilhada
    initSharedUI();
    setupCategoryDropdowns();

    const incomeForm = document.getElementById('incomeForm');
    
    // Setup form submission
    if (incomeForm) {
        incomeForm.addEventListener('submit', handleIncomeSubmit);
    }
});

async function handleIncomeSubmit(e) {
    e.preventDefault();
    
    try {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value; // Hidden input from custom dropdown
        const date = document.getElementById('date').value;
        const isFixed = document.getElementById('isFixed').checked;
        
        if (!description || !amount || !category || !date) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        
        const income = {
            description,
            amount,
            category,
            date,
            isFixed,
            createdAt: new Date().toISOString()
        };
        
        // Save using dataManager
        dataManager.addIncome(income);
        
        showNotification('Receita adicionada com sucesso!', 'success');
        e.target.reset();
        
        // Reset custom dropdown if needed
        const categorySelected = document.getElementById('category-selected');
        if (categorySelected) {
            const span = categorySelected.querySelector('span');
            if (span) span.textContent = 'Selecione uma categoria';
        }
        
    } catch (error) {
        console.error('Erro ao adicionar receita:', error);
        showNotification('Erro ao adicionar receita.', 'error');
    }
}
