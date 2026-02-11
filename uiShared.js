
import { cloudSync } from './cloudSync.js'; // Importar para garantir proteção de rota
import { dataManager } from './dataManager.js';
import { notificationSystem, showNotification } from './notificationSystem.js';

// Função para verificar autenticação explicitamente (útil para settings.js)
export async function checkAuth() {
    // Se cloudSync já carregou e tem usuário, retorna true
    if (cloudSync.clerk && cloudSync.clerk.user) {
        return cloudSync.clerk.user;
    }
    
    // Se ainda está carregando, tenta esperar um pouco (opcional, mas seguro)
    // Em settings.js chamamos initSharedUI primeiro, que inicializa cloudSync
    // Mas cloudSync é assíncrono na carga do Clerk.
    
    // Tenta pegar direto do window se o cloudSync falhou ou ainda não setou
    if (window.Clerk && window.Clerk.user) {
        return window.Clerk.user;
    }

    // Se não autenticado, redireciona
    // Nota: cloudSync já faz isso automaticamente na inicialização, 
    // mas settings.js pode precisar de confirmação antes de renderizar
    if (window.Clerk) {
        // Se Clerk carregou mas não tem user, tenta carregar sessão ou redirecionar
        if (!window.Clerk.session) {
             window.Clerk.redirectToSignIn();
             return null;
        }
    }
    
    return null;
}

// Implementação da renderização de notificações (Visual)
function showNotificationRenderer(message, type = 'success') {
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

// Inicializar sistema de notificações
export function initNotificationSystem() {
    notificationSystem.initialize(showNotificationRenderer);
}

/**
 * Preenche um seletor de meses
 * @param {HTMLElement} selectElement 
 */
export function populateMonthSelector(selectElement) {
    if (!selectElement) return;
    
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    selectElement.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        selectElement.appendChild(option);
    });
    
    // Definir mês atual
    selectElement.value = new Date().getMonth() + 1;
}

// Função para alternar histórico de auto-save
export function toggleAutoSaveHistory() {
    const historyContainer = document.getElementById('auto-save-panel'); // ID corrigido conforme HTML
    if (historyContainer) {
        historyContainer.style.display = historyContainer.style.display === 'none' ? 'block' : 'none';
        if (historyContainer.style.display === 'block') {
            loadAutoSaveVersions();
        }
    }
}

// Carregar versões do auto-save
export function loadAutoSaveVersions() {
    try {
        let versions = [];
        // DataManager já deve estar inicializado
        versions = dataManager.getAutoSaveVersions();
        
        const container = document.getElementById('auto-save-versions');
        
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
                button.className = 'btn-small';
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
        console.error('Erro ao carregar versões de auto-save:', error);
    }
}

// Restaurar versão específica
export async function restoreVersion(id) {
    try {
        const success = await dataManager.restoreAutoSaveVersion(id);
        if (success) {
            showNotification('Versão restaurada com sucesso! Recarregando...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification('Falha ao restaurar versão.', 'error');
        }
    } catch (error) {
        console.error('Erro ao restaurar versão:', error);
        showNotification('Erro ao restaurar versão: ' + error.message, 'error');
    }
}

// Configurar dropdowns de categoria
export function setupCategoryDropdowns() {
    const categorySelects = document.querySelectorAll('select[name="category"], #category');
    
    // Categorias padrão
    const expenseCategories = [
        'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 
        'Lazer', 'Vestuário', 'Serviços', 'Dívidas', 'Outros'
    ];
    
    const incomeCategories = [
        'Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'
    ];
    
    categorySelects.forEach(select => {
        // Verificar se é um select de despesa ou receita pelo contexto (se possível)
        // Por padrão, carregamos despesas se não houver indicação
        if (select.options.length <= 1) { // Só tem o placeholder
            const isIncome = select.closest('.income-section') || select.id === 'income-category';
            const categories = isIncome ? incomeCategories : expenseCategories;
            
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }
    });
}

// Registrar Service Worker
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registrado com sucesso: ', registration.scope);
                })
                .catch(err => {
                    console.log('Falha ao registrar ServiceWorker: ', err);
                });
        });
    }
}

// Função de inicialização compartilhada (chamada por todas as páginas)
export function initSharedUI() {
    initNotificationSystem();
    registerServiceWorker();
    setupSideNavButtons();
    
    // Inicializar cloudSync (auth) se disponível
    if (cloudSync && typeof cloudSync.init === 'function') {
        cloudSync.init();
    }
}

// Configurar botões da barra lateral que existem em todas as páginas
function setupSideNavButtons() {
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.onclick = (e) => {
            e.preventDefault();
            import('./dataManager.js').then(m => m.dataManager.saveToFile());
        };
    }

    const importBtn = document.getElementById('import-data-btn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
        importBtn.onclick = (e) => {
            e.preventDefault();
            importFile.click();
        };
        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                import('./dataManager.js').then(m => m.dataManager.loadFromFileInput(file));
            }
        };
    }

    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) {
                import('./dataManager.js').then(m => m.dataManager.clearAllData());
            }
        };
    }

    const historyBtn = document.getElementById('auto-save-history-btn');
    if (historyBtn) {
        historyBtn.onclick = (e) => {
            e.preventDefault();
            toggleAutoSaveHistory();
        };
    }

    const loadVersionsBtn = document.getElementById('load-versions-btn');
    if (loadVersionsBtn) {
        loadVersionsBtn.onclick = (e) => {
            e.preventDefault();
            loadAutoSaveVersions();
        };
    }

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja limpar todo o histórico de auto-saves?')) {
                import('./dataManager.js').then(m => m.dataManager.clearAutoSaveHistory());
            }
        };
    }
}
