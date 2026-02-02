
import { eventBus } from './eventBus.js';
import { dataManager } from './dataManager.js';
import { updateDashboardCards } from './updateDashboardCards.js';
import { aiService } from './aiService.js';
import { initSharedUI, setupCategoryDropdowns } from './uiShared.js';
import { showNotification } from './notificationSystem.js';
import { cloudSync } from './cloudSync.js';
import { smartAutoSave } from './smartAutoSave.js';

// Inicialização do sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('[SCRIPT]: DOM carregado, inicializando sistema...');
    
    try {
        // Inicializar UI Compartilhada (Notificações, Navegação, AutoSave)
        initSharedUI();
        
        // Inicializar sistema de eventos local
        initializeEventSystem();
        
        // Configurar dashboard se estivermos na página principal
        if (document.querySelector('.dashboard-bottom') || document.querySelector('.summary-cards')) {
            setupDashboard();
        }
        
        // Configurar listeners de formulários
        setupFormListeners();
        
        // Configurar dropdowns de categoria
        setupCategoryDropdowns();
        
        // Configurar listeners gerais
        setupEventListeners();

        console.log('[SCRIPT]: Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('[SCRIPT]: Erro na inicialização:', error);
        showNotification('Erro na inicialização do sistema', 'error');
    }
});

// Configurar sistema de eventos
function initializeEventSystem() {
    console.log('[SCRIPT]: Configurando sistema de eventos...');
    
    // Escutar eventos do sistema
    eventBus.on('dashboard:update', (data) => {
        console.log('[SCRIPT]: Evento dashboard:update recebido');
        updateDashboardWithData(data);
    });
    
    eventBus.on('system:error', (errorData) => {
        console.log('[SCRIPT]: Evento system:error recebido');
        handleSystemError(errorData);
    });
}

// Configurar dashboard
function setupDashboard() {
    console.log('[SCRIPT]: Configurando dashboard...');
    
    // Solicitar atualização inicial do dashboard
    requestDashboardUpdate();
    
    // Configurar listeners dos filtros
    const monthSelect = document.getElementById('month');
    const yearInput = document.getElementById('year');
    
    if (monthSelect && yearInput) {
        // Definir mês/ano atual se não definido
        if (!monthSelect.value) monthSelect.value = new Date().getMonth() + 1;
        
        monthSelect.addEventListener('change', () => {
            console.log('[SCRIPT]: Filtro de mês alterado');
            requestDashboardUpdate();
        });
        
        yearInput.addEventListener('change', () => {
            console.log('[SCRIPT]: Filtro de ano alterado');
            requestDashboardUpdate();
        });
    }
}

// Solicitar atualização do dashboard
function requestDashboardUpdate() {
    console.log('[SCRIPT]: Solicitando atualização do dashboard...');
    
    try {
        const monthSelect = document.getElementById('month');
        const yearInput = document.getElementById('year');
        
        const month = monthSelect ? parseInt(monthSelect.value) : new Date().getMonth() + 1;
        const year = yearInput ? parseInt(yearInput.value) : new Date().getFullYear();
        
        // Solicitar dados via DataManager
        const data = dataManager.getAllData();
        // Filtrar despesas e receitas pelo mês/ano aqui ou no updateDashboardCards?
        // O updateDashboardCards espera expensesData e incomeData FILTRADOS ou TOTAIS?
        // Olhando updateDashboardCards.js (não tenho o código aqui, mas assumindo que ele processa tudo ou espera dados brutos).
        // No código original, dataManager.getAllData() retorna tudo.
        // updateDashboardCards(expensesData, incomeData, month, year) recebe month/year, então ele deve filtrar.
        
        // Vamos passar os dados completos e deixar ele filtrar
        updateDashboardWithData({ ...data, month, year });
        
        // Gerar recomendações de IA
        generateAIRecommendations(data);
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao solicitar atualização:', error);
        eventBus.emit('system:error', { message: 'Erro interno do sistema' });
    }
}

// Atualizar dashboard com dados
function updateDashboardWithData(data) {
    console.log('[SCRIPT]: Atualizando dashboard com dados:', data);
    
    try {
        const { expenses = [], income = [], month, year } = data;
        updateDashboardCards(expenses, income, month, year);
    } catch (error) {
        console.error('[SCRIPT]: Erro ao atualizar dashboard:', error);
        eventBus.emit('system:error', { message: 'Erro ao atualizar dashboard' });
    }
}

// Tratar erros do sistema
function handleSystemError(errorData) {
    try {
        console.error('[SCRIPT]: Erro do sistema recebido:', errorData);
        showNotification(errorData.message || 'Erro no sistema', 'error');
    } catch (error) {
        console.error('[SCRIPT]: Erro ao tratar erro do sistema:', error);
    }
}

// Configurar listeners de formulários
function setupFormListeners() {
    console.log('[SCRIPT]: Configurando listeners de formulários...');
    
    // Listener para formulário de despesas
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }
    
    // Listener para formulário de receitas
    const incomeForm = document.getElementById('income-form');
    if (incomeForm) {
        incomeForm.addEventListener('submit', function(e) {
            console.log('[SCRIPT]: Formulário de receita submetido');
            // Lógica será tratada pelo módulo de receitas (se houver)
        });
    }
    
    // Listeners para validação em tempo real
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        });
    });
}

// Tratar submissão de formulário de despesas
function handleExpenseSubmit(event) {
    console.log('[SCRIPT]: Tratando submissão de despesa...');
    
    try {
        // A lógica específica será tratada pelo módulo de despesas
        // Aqui apenas logamos o evento
        const formData = new FormData(event.target);
        const expenseData = Object.fromEntries(formData.entries());
        console.log('[SCRIPT]: Dados da despesa:', expenseData);
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao tratar submissão de despesa:', error);
        showNotification('Erro ao processar despesa', 'error');
    }
}

// Configurar listeners de eventos gerais
function setupEventListeners() {
    console.log('[SCRIPT]: Configurando event listeners gerais...');
    
    // Listeners para formulários
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        // Evitar duplicação se já adicionado em setupFormListeners
        if (form.id !== 'expense-form' && form.id !== 'income-form') {
            form.addEventListener('submit', function(e) {
                console.log('[SCRIPT]: Formulário submetido');
            });
        }
    });
    
    // Listeners para botões de ação
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const action = this.getAttribute('data-action');
            console.log('[SCRIPT]: Ação executada:', action);
        });
    });
}

// Função para gerar recomendações de IA
function generateAIRecommendations(data) {
    try {
        console.log('[SCRIPT]: Gerando recomendações de IA...');
        
        let recommendations = [];
        if (aiService) {
            recommendations = aiService.analyzeUserData(data);
        } else {
            console.error('[SCRIPT]: AIService não disponível');
            recommendations.push({
                type: 'warning',
                title: 'Serviço Indisponível',
                message: 'O serviço de inteligência artificial não foi carregado corretamente.'
            });
        }
        displayRecommendations(recommendations);
        
    } catch (error) {
        console.error('[SCRIPT]: Erro na geração de recomendações:', error);
    }
}

// Exibir recomendações
function displayRecommendations(recommendations) {
    try {
        const container = document.getElementById('ai-recommendations');
        if (!container) return;
        
        // Manter o header e loading se necessário, mas aqui vamos limpar tudo exceto o título se quisermos
        // O HTML tem <h3>Recomendações de IA</h3> fora do container #ai-recommendations?
        // Verificando index.html: 
        // <div class="ai-recommendations card">
        //    <h3>Recomendações de IA</h3>
        //    <div class="recommendations-content" id="ai-recommendations">...</div>
        // </div>
        
        container.innerHTML = '';
        
        if (recommendations.length === 0) {
            container.innerHTML = '<p>Nenhuma recomendação no momento.</p>';
            return;
        }
        
        recommendations.forEach(rec => {
            const recElement = document.createElement('div');
            recElement.className = `recommendation ${rec.type || 'info'}`;
            
            const h4 = document.createElement('h4');
            h4.textContent = rec.title;
            
            const p = document.createElement('p');
            p.textContent = rec.message;
            
            recElement.appendChild(h4);
            recElement.appendChild(p);
            
            container.appendChild(recElement);
        });
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao exibir recomendações:', error);
    }
}
