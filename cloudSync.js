import { eventBus } from './eventBus.js';
import { dataManager } from './dataManager.js';

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
        
        // Initialize Clerk
        this.initClerk();
    }

    async initClerk() {
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

    async configureClerk() {
        const publishableKey = 'pk_test_cmlnaHQtcXVhZ2dhLTMwLmNsZXJrLmFjY291bnRzLmRldiQ'; // REPLACE WITH YOUR KEY or load from env
        // Em um ambiente real, isso viria de uma config injetada
        
        if (!window.Clerk) return;

        try {
            this.clerk = new window.Clerk(publishableKey);
            await this.clerk.load();

            if (this.clerk.user) {
                this.handleLogin(this.clerk.user);
            } else {
                this.handleLogout();
            }

            this.setupUI();
        } catch (error) {
            console.error('[CLOUD]: Clerk init error:', error);
            // Fallback for demo without key
            this.updateUIStatus('offline');
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
        // window.userId = user.id; // Removed global access
        
        // Update UI
        document.getElementById('sign-in-btn').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('user-email').textContent = user.primaryEmailAddress.emailAddress;
        
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
        // window.userId = null; // Removed global access
        
        // Update UI
        document.getElementById('sign-in-btn').style.display = 'block';
        document.getElementById('user-profile').style.display = 'none';
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
        if (!this.isAuthenticated) return;
        this.updateUIStatus('syncing');

        try {
            const response = await fetch('/api/sync', {
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
                            // Recarregar UI para refletir os novos dados
                            window.location.reload(); 
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

            await fetch('/api/sync', {
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
