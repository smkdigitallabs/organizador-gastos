// Inicialização do sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('[SCRIPT]: DOM carregado, inicializando sistema...');
    
    // Verificar se os módulos necessários estão disponíveis
    if (typeof EventBus === 'undefined') {
        console.error('[SCRIPT]: EventBus não encontrado!');
        return;
    }
    
    if (typeof dataManager === 'undefined') {
        console.error('[SCRIPT]: DataManager não encontrado!');
        return;
    }
    
    try {
        // Inicializar sistema de eventos
        initializeEventSystem();
        
        // Configurar dashboard se estivermos na página principal
        if (document.querySelector('.dashboard')) {
            setupDashboard();
        }
        
        console.log('[SCRIPT]: Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('[SCRIPT]: Erro na inicialização:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erro na inicialização do sistema', 'error');
        }
    }
});

// Configurar sistema de eventos
function initializeEventSystem() {
    console.log('[SCRIPT]: Configurando sistema de eventos...');
    
    // Escutar eventos do sistema
    EventBus.on('dashboard:update', (data) => {
        console.log('[SCRIPT]: Evento dashboard:update recebido');
        updateDashboardWithData(data);
    });
    
    EventBus.on('system:error', (errorData) => {
        console.log('[SCRIPT]: Evento system:error recebido');
        handleSystemError(errorData);
    });
    
    // Configurar listeners de navegação
    setupNavigationListeners();
    
    // Configurar listeners de formulários
    setupFormListeners();
    
    // Configurar dropdowns de categoria
    setupCategoryDropdowns();
}

// Configurar dashboard
function setupDashboard() {
    console.log('[SCRIPT]: Configurando dashboard...');
    
    // Solicitar atualização inicial do dashboard
    requestDashboardUpdate();
    
    // Configurar listeners dos filtros
    const monthSelect = document.getElementById('month-select');
    const yearInput = document.getElementById('year-input');
    
    if (monthSelect && yearInput) {
        const filterData = [
            { month: monthSelect.value, year: yearInput.value }
        ];
        
        monthSelect.addEventListener('change', () => {
            console.log('[SCRIPT]: Filtro de mês alterado');
            requestDashboardUpdate();
        });
        
        yearInput.addEventListener('change', () => {
            console.log('[SCRIPT]: Filtro de ano alterado');
            requestDashboardUpdate();
        });
        
        // Configurar auto-save se disponível
        if (typeof SmartAutoSave !== 'undefined') {
            console.log('[SCRIPT]: Configurando auto-save...');
            // Auto-save será configurado pelo SmartAutoSave
        }
    }
}

// Solicitar atualização do dashboard
function requestDashboardUpdate() {
    console.log('[SCRIPT]: Solicitando atualização do dashboard...');
    
    try {
        const monthSelect = document.getElementById('month-select');
        const yearInput = document.getElementById('year-input');
        
        const month = monthSelect ? monthSelect.value : new Date().getMonth() + 1;
        const year = yearInput ? yearInput.value : new Date().getFullYear();
        
        // Solicitar dados via DataManager
        dataManager.getAllData().then(data => {
            console.log('[SCRIPT]: Dados recebidos, atualizando dashboard...');
            updateDashboardWithData({ ...data, month, year });
        }).catch(error => {
            console.error('[SCRIPT]: Erro ao obter dados:', error);
            EventBus.emit('system:error', { message: 'Erro ao carregar dados do dashboard' });
        });
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao solicitar atualização:', error);
        EventBus.emit('system:error', { message: 'Erro interno do sistema' });
    }
}

// Atualizar dashboard com dados
function updateDashboardWithData(data) {
    console.log('[SCRIPT]: Atualizando dashboard com dados:', data);
    
    try {
        // Usar a função updateDashboardCards se disponível
        if (typeof updateDashboardCards === 'function') {
            updateDashboardCards(data);
        } else {
            console.warn('[SCRIPT]: updateDashboardCards não encontrada, usando fallback');
            // Fallback básico
            if (typeof showNotification === 'function') {
                showNotification('Dashboard atualizado', 'success');
            }
        }
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao atualizar dashboard:', error);
        EventBus.emit('system:error', { message: 'Erro ao atualizar dashboard' });
    }
}

// Tratar erros do sistema
function handleSystemError(errorData) {
    try {
        console.error('[SCRIPT]: Erro do sistema recebido:', errorData);
        
        // Mostrar notificação se disponível
        if (typeof showNotification === 'function') {
            showNotification(errorData.message || 'Erro no sistema', 'error');
        }
        
    } catch (error) {
        console.error('[SCRIPT]: Erro ao tratar erro do sistema:', error);
    }
}

// Adicionar interatividade aos links do menu apenas se eles existirem
const navLinks = document.querySelectorAll('nav a');
if (navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remover classe active de todos os links
            navLinks.forEach(l => l.classList.remove('active'));
            // Adicionar classe active ao link clicado
            this.classList.add('active');
        });
    });
}

// Implementação da função showNotification
function showNotificationImpl(message, type = 'success') {
    console.log(`[NOTIFICATION]: ${type.toUpperCase()} - ${message}`);
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Estilos inline para garantir visibilidade
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        ${type === 'success' ? 'background-color: #4CAF50;' : ''}
        ${type === 'error' ? 'background-color: #f44336;' : ''}
        ${type === 'warning' ? 'background-color: #ff9800;' : ''}
        ${type === 'info' ? 'background-color: #2196F3;' : ''}
    `;
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Configurar showNotification global se não existir
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.showNotification === 'undefined') {
        window.showNotification = showNotificationImpl;
        console.log('[SCRIPT]: showNotification configurada globalmente');
    }
});


// Função para gerar recomendações de IA
function generateAIRecommendations() {
    try {
        console.log('[SCRIPT]: Gerando recomendações de IA...');
        
        // Obter dados para análise
        dataManager.getAllData().then(data => {
            let recommendations = [];
            if (window.aiService) {
                recommendations = window.aiService.analyzeUserData(data);
            } else {
                console.error('[SCRIPT]: AIService não disponível');
                recommendations.push({
                    type: 'warning',
                    title: 'Serviço Indisponível',
                    message: 'O serviço de inteligência artificial não foi carregado corretamente.'
                });
            }
            displayRecommendations(recommendations);
        }).catch(error => {
            console.error('[SCRIPT]: Erro ao gerar recomendações:', error);
        });
        
    } catch (error) {
        console.error('[SCRIPT]: Erro na geração de recomendações:', error);
    }
}

// Exibir recomendações
function displayRecommendations(recommendations) {
    try {
        const container = document.getElementById('ai-recommendations');
        if (!container) return;
        
        container.innerHTML = '';
        
        recommendations.forEach(rec => {
            const recElement = document.createElement('div');
            recElement.className = `recommendation ${rec.type}`;
            
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

// Função para alternar histórico de auto-save
function toggleAutoSaveHistory() {
    const historyContainer = document.getElementById('autosave-history');
    if (historyContainer) {
        historyContainer.style.display = historyContainer.style.display === 'none' ? 'block' : 'none';
        if (historyContainer.style.display === 'block') {
            loadAutoSaveVersions();
        }
    }
}

// Carregar versões do auto-save
function loadAutoSaveVersions() {
    try {
        let versions = [];
        if (typeof dataManager !== 'undefined') {
            versions = dataManager.getAutoSaveVersions();
        } else {
            // Fallback para localStorage direto se DataManager não estiver disponível
            versions = JSON.parse(localStorage.getItem('autoSaveHistory') || '[]');
        }
        
        const container = document.getElementById('autosave-versions');
        
        if (container) {
            container.innerHTML = '';
            
            if (versions.length === 0) {
                const p = document.createElement('p');
                p.className = 'no-data';
                p.textContent = 'Nenhuma versão salva automaticamente.';
                container.appendChild(p);
                return;
            }
            
            // DataManager já retorna ordenado (unshift), então pegamos as primeiras 10
            versions.slice(0, 10).forEach((version) => {
                const versionElement = document.createElement('div');
                versionElement.className = 'autosave-version';
                
                const span = document.createElement('span');
                const date = new Date(version.timestamp);
                span.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${version.version || 'v?'})`;
                
                const button = document.createElement('button');
                button.textContent = 'Restaurar';
                // Usar ID real da versão para restauração correta
                button.dataset.restoreVersion = version.id;
                button.onclick = function() {
                    const id = parseInt(this.dataset.restoreVersion);
                    if (confirm('Tem certeza que deseja restaurar esta versão? Os dados atuais serão substituídos.')) {
                        restoreVersion(id);
                    }
                };
                
                versionElement.appendChild(span);
                versionElement.appendChild(button);
                container.appendChild(versionElement);
            });
        }
    } catch (error) {
        console.error('[SCRIPT]: Erro ao carregar versões:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erro ao carregar histórico de versões', 'error');
        }
    }
}

// Event listener para cliques em versões de auto-save
document.addEventListener('click', function(event) {
    if (event.target.matches('[data-restore-version]')) {
        const versionIndex = parseInt(event.target.getAttribute('data-restore-version'));
        // Implementar restauração de versão
        console.log('[SCRIPT]: Restaurando versão:', versionIndex);
    }
});

// Configurar listeners de eventos
function setupEventListeners() {
    console.log('[SCRIPT]: Configurando event listeners...');
    
    // Listeners para formulários
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            console.log('[SCRIPT]: Formulário submetido');
            // Lógica de submissão será tratada pelos módulos específicos
        });
    });
    
    // Listeners para botões de ação
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const action = this.getAttribute('data-action');
            console.log('[SCRIPT]: Ação executada:', action);
            // Tratar ações específicas
        });
    });
}

// Configurar dropdowns de categoria
function setupCategoryDropdowns() {
    console.log('[SCRIPT]: Configurando dropdowns de categoria...');
    
    const categorySelects = document.querySelectorAll('.category-select');
    categorySelects.forEach(select => {
        select.addEventListener('change', function() {
            console.log('[SCRIPT]: Categoria alterada:', this.value);
        });
        
        // Adicionar opções se necessário
        if (select.children.length === 0) {
            const categories = [
                'alimentacao', 'transporte', 'moradia', 'saude', 'educacao',
                'lazer', 'vestuario', 'servicos', 'investimentos', 'outros'
            ];
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                select.appendChild(option);
            });
        }
        
        // Configurar busca se necessário
        setTimeout(() => {
            // Lógica de busca/filtro
        }, 0);
    });
}

// Fechar todos os dropdowns
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown.active');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Fechar dropdowns de categoria
function closeCategoryDropdowns(event) {
    const categoryDropdowns = document.querySelectorAll('.category-dropdown');
    categoryDropdowns.forEach(dropdown => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// Event listener para fechar dropdowns ao clicar fora
document.addEventListener('click', closeCategoryDropdowns);

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
            // Lógica será tratada pelo módulo de receitas
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

// Configurar listeners de navegação
function setupNavigationListeners() {
    console.log('[SCRIPT]: Configurando listeners de navegação...');
    
    const navLinks = document.querySelectorAll('nav a, .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigationClick);
    });
    
    // Listener para botão de voltar
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    });
    
    // Listener para mudanças de hash
    window.addEventListener('hashchange', function() {
        console.log('[SCRIPT]: Hash alterado:', window.location.hash);
    });
    
    // Listener para popstate (botão voltar do navegador)
    window.addEventListener('popstate', function(e) {
        console.log('[SCRIPT]: Popstate detectado');
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
        if (typeof showNotification === 'function') {
            showNotification('Erro ao processar despesa', 'error');
        }
    }
}

// Tratar cliques de navegação
function handleNavigationClick(event) {
    console.log('[SCRIPT]: Clique de navegação detectado');
    
    try {
        const link = event.currentTarget;
        const href = link.getAttribute('href');
        
        // Se for um link interno, podemos adicionar lógica especial
        if (href && href.startsWith('#')) {
            console.log('[SCRIPT]: Navegação interna:', href);
        } else if (href && !href.startsWith('http')) {
            console.log('[SCRIPT]: Navegação local:', href);
        }
        
        // Atualizar estado ativo
        const navLinks = document.querySelectorAll('nav a, .nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
    } catch (error) {
        console.error('[SCRIPT]: Erro na navegação:', error);
    }
}

// Função global para restaurar versão
function restoreVersion(versionId) {
    if (typeof dataManager !== 'undefined') {
        console.log('[SCRIPT]: Restaurando versão via DataManager:', versionId);
        // dataManager.restoreAutoSaveVersion retorna true/false ou promise
        dataManager.restoreAutoSaveVersion(versionId);
    } else {
        console.error('[SCRIPT]: DataManager não encontrado para restaurar versão');
        if (typeof showNotification === 'function') {
            showNotification('Erro: Gerenciador de dados indisponível', 'error');
        }
    }
}