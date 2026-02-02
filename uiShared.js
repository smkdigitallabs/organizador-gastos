
import { dataManager } from './dataManager.js';
import { notificationSystem, showNotification } from './notificationSystem.js';

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
        console.error('[UI]: Erro ao carregar versões:', error);
        showNotification('Erro ao carregar histórico de versões', 'error');
    }
}

// Função para restaurar versão
export function restoreVersion(versionId) {
    console.log('[UI]: Restaurando versão via DataManager:', versionId);
    dataManager.restoreAutoSaveVersion(versionId);
    // Recarregar a página ou atualizar UI após restaurar?
    // DataManager emite evento 'data:restored' ou similar?
    // Por enquanto, reload para garantir consistência visual
    setTimeout(() => window.location.reload(), 1000);
}

// Configurar listeners de navegação
export function setupNavigationListeners() {
    console.log('[UI]: Configurando listeners de navegação...');
    
    // Listener para botão de voltar
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    });
    
    // Adicionar interatividade aos links do menu
    const navLinks = document.querySelectorAll('nav a');
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Se não for link com # (ação JS), permitir navegação
                const href = this.getAttribute('href');
                if (href && href !== '#' && !href.startsWith('javascript:')) {
                    // Remover classe active de todos os links
                    navLinks.forEach(l => l.classList.remove('active'));
                    // Adicionar classe active ao link clicado
                    this.classList.add('active');
                }
            });
        });
    }
}

// Configurar dropdowns de categoria (usado em múltiplos lugares?)
export function setupCategoryDropdowns() {
    console.log('[UI]: Configurando dropdowns de categoria...');
    
    const categorySelects = document.querySelectorAll('.category-select');
    categorySelects.forEach(select => {
        // Adicionar opções se vazio
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
    });
}

// Inicialização comum da UI
export function initSharedUI() {
    initNotificationSystem();
    setupNavigationListeners();
    
    // Bind global buttons
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => dataManager.exportBackup());
    
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn) importBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('importFile');
        if (fileInput) fileInput.click();
    });
    
    const importFile = document.getElementById('importFile');
    if (importFile) importFile.addEventListener('change', (e) => dataManager.loadFromFileInput(e.target.files[0]));
    
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => dataManager.clearAllData());
    
    const autoSaveBtn = document.getElementById('auto-save-history-btn');
    if (autoSaveBtn) autoSaveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAutoSaveHistory();
    });
    
    const loadVersionsBtn = document.getElementById('load-versions-btn');
    if (loadVersionsBtn) loadVersionsBtn.addEventListener('click', loadAutoSaveVersions);
    
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => dataManager.clearAutoSaveHistory());
}
