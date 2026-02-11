import { eventBus } from './eventBus.js';
import { dataManager } from './dataManager.js';
import { initDarkMode } from './uiShared.js';

/**
 * Cloud Sync Service
 * Integrates Clerk Auth and Neon DB Sync
 */
export class CloudSync {
    constructor() {
        this.clerk = null;
        this.isAuthenticated = false;
        this.userId = null;
        this.syncInProgress = false;
        this.dataManager = dataManager;
    }

    async init() {
        if (this.clerk) return;
        try {
            // Load Clerk JS from CDN if not present (fallback) or assume bundle
            // Here we assume window.Clerk is available via script tag in index.html
            // But we need to inject it first.
            
            // For this implementation, we'll check if script is loaded
            if (!document.getElementById('clerk-script')) {
                const script = document.createElement('script');
                script.id = 'clerk-script';
                script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
                script.crossOrigin = 'anonymous';
                script.onload = () => this.configureClerk();
                document.head.appendChild(script);
            } else {
                this.configureClerk();
            }
        } catch (error) {
            console.error('[CLOUD]: Failed to load Clerk:', error);
        }
    }

    ensureOverlay() {
        let overlay = document.getElementById('auth-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'auth-loading-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #f0f2f5; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: "Segoe UI", sans-serif;';
            overlay.innerHTML = `
                <div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                <h2 style="color: #2c3e50;">Verificando Autenticação...</h2>
                <p style="color: #7f8c8d;">Por favor, aguarde.</p>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    async configureClerk() {
        // Garantir que o overlay existe antes de tudo
        this.ensureOverlay();

        // Usar chave do ambiente (Vite)
        const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
        
        if (!publishableKey) {
            console.error('[CLOUD]: VITE_CLERK_PUBLISHABLE_KEY não definida!');
            this.updateUIStatus('error');
            return;
        }
        
        if (!window.Clerk) return;

        try {
            this.clerk = new window.Clerk(publishableKey);
            await this.clerk.load();

            const overlay = document.getElementById('auth-loading-overlay');

            if (this.clerk.user) {
                console.log('[CLOUD]: Usuário autenticado');
                this.handleLogin(this.clerk.user);
                
                // Remover overlay apenas se autenticado
                if (overlay) overlay.style.display = 'none';
            } else {
                console.log('[CLOUD]: Usuário não autenticado. Redirecionando...');
                // Redirecionar para login IMEDIATAMENTE
                this.clerk.redirectToSignIn({
                    redirectUrl: window.location.href
                });
                // NÃO remover o overlay para evitar flash de conteúdo não autorizado
            }

            this.setupUI();
        } catch (error) {
            console.error('[CLOUD]: Clerk init error:', error);
            this.updateUIStatus('offline');
            // Em caso de erro crítico, permitir uso offline mas avisar
            const overlay = document.getElementById('auth-loading-overlay');
            if (overlay) {
                overlay.innerHTML = `
                    <div style="text-align: center; color: #e74c3c;">
                        <h2>Erro de Conexão</h2>
                        <p>Não foi possível verificar sua identidade.</p>
                        <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Tentar Novamente</button>
                    </div>
                `;
            }
        }
    }

    setupUI() {
        const signInBtn = document.getElementById('sign-in-btn');
        const signOutBtn = document.getElementById('sign-out-btn');

        if (signInBtn) {
            signInBtn.onclick = () => this.clerk.openSignIn();
        }

        if (signOutBtn) {
            signOutBtn.onclick = () => {
                this.clerk.signOut();
                this.handleLogout();
            };
        }
    }

    handleLogin(user) {
        this.isAuthenticated = true;
        this.userId = user.id;
        
        // Update DataManager context to isolate user data
        if (this.dataManager) {
            this.dataManager.setUserId(this.userId);
        }
        
        // Update UI
        const signInBtn = document.getElementById('sign-in-btn');
        const userProfile = document.getElementById('user-profile');
        const userEmail = document.getElementById('user-email');

        if (signInBtn) signInBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (userEmail) userEmail.textContent = user.primaryEmailAddress.emailAddress;
        
        // Start Sync
        this.pullData();
        
        // Listen for changes
        if (eventBus) {
            eventBus.on('data:updated', () => this.pushData());
        }
    }

    handleLogout() {
        this.isAuthenticated = false;
        this.userId = null;
        
        // Revert DataManager to guest mode
        if (this.dataManager) {
            this.dataManager.setUserId(null);
        }
        
        // Update UI
        const signInBtn = document.getElementById('sign-in-btn');
        const userProfile = document.getElementById('user-profile');

        if (signInBtn) signInBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
    }

    updateUIStatus(status) {
        const indicator = document.getElementById('sync-status');
        if (!indicator) return;
        
        switch(status) {
            case 'syncing':
                indicator.style.backgroundColor = 'orange';
                indicator.title = 'Sincronizando...';
                break;
            case 'online':
                indicator.style.backgroundColor = '#2ecc71';
                indicator.title = 'Sincronizado';
                break;
            case 'error':
                indicator.style.backgroundColor = '#e74c3c';
                indicator.title = 'Erro na sincronização';
                break;
            default:
                indicator.style.backgroundColor = 'gray';
                indicator.title = 'Offline';
        }
    }

    async pullData() {
        if (!this.isAuthenticated || this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.updateUIStatus('syncing');

        try {
            console.log('[CLOUD]: Iniciando sync (pull)...');
            
            const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            const API_BASE_URL = isLocal ? 'https://organizador-de-gastos.vercel.app' : '';

            const response = await fetch(`${API_BASE_URL}/api/sync`, {
                method: 'GET',
                headers: {
                    'User-Id': this.userId,
                    'Authorization': `Bearer ${await this.clerk.session.getToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Se houver dados remotos, atualizar local
                // CUIDADO: Isso sobrescreve dados locais. 
                // Idealmente, deveríamos fazer merge. 
                // Para V1, assumimos que a nuvem é a fonte da verdade se não estiver vazia.
                
                if (data.expenses && data.expenses.length > 0) {
                    if (dataManager) {
                        // Salvar dados usando o novo método seguro do DataManager
                        // Isso garante que os dados sejam salvos no contexto do usuário correto
                        const success = dataManager.saveRemoteData(data);
                        
                        if (success) {
                            // Atualizar UI via EventBus em vez de recarregar
                            console.log('[CLOUD]: Dados atualizados, solicitando refresh da UI');
                            // notifyDataChange já foi chamado pelos métodos save* do DataManager
                            // Mas para garantir, podemos forçar um update
                            if (window.eventBus) {
                                window.eventBus.emit('dashboard:update', dataManager.getAllData());
                            }
                        }
                    }
                }
                this.updateUIStatus('online');
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            console.error('[CLOUD]: Pull error:', error);
            this.updateUIStatus('error');
        } finally {
            this.syncInProgress = false;
        }
    }

    async pushData() {
        if (!this.isAuthenticated || this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.updateUIStatus('syncing');

        try {
            const data = dataManager.getAllData();
            // Adicionar categorias que não estão no getAllData padrão se necessário
            data.categories = {
                expense: dataManager.getExpenseCategories(),
                income: dataManager.getIncomeCategories()
            };

            // Determine API Base URL
            // If running in Electron (file protocol) or local dev without proxy, point to production
            // Adjust this logic if you have a local backend running
            const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            const API_BASE_URL = isLocal ? 'https://organizador-de-gastos.vercel.app' : '';

            await fetch(`${API_BASE_URL}/api/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Id': this.userId,
                    'Authorization': `Bearer ${await this.clerk.session.getToken()}`
                },
                body: JSON.stringify(data)
            });
            
            this.updateUIStatus('online');
        } catch (error) {
            console.error('[CLOUD]: Push error:', error);
            this.updateUIStatus('error');
        } finally {
            this.syncInProgress = false;
        }
    }
}

// Inicializar
export const cloudSync = new CloudSync();
