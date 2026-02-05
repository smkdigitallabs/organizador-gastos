
import { initSharedUI, checkAuth } from './uiShared.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar UI compartilhada (Sidebar, Dark Mode, etc)
    initSharedUI();
    
    // Verificar autenticação
    const user = await checkAuth();
    if (!user) return; // checkAuth redireciona se falhar

    const form = document.getElementById('whatsapp-settings-form');
    const phoneInput = document.getElementById('whatsapp-phone');
    const messageDiv = document.getElementById('settings-message');

    // Carregar configurações atuais
    loadSettings();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = phoneInput.value;

        if (!phone) {
            showMessage('Por favor, insira um número.', 'error');
            return;
        }

        try {
            await saveSettings(phone);
            showMessage('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showMessage('Erro ao salvar configurações.', 'error');
        }
    });

    async function loadSettings() {
        try {
            // Usar o token do Clerk para autenticar a requisição
            const token = await window.Clerk.session.getToken();
            
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.phone) {
                    phoneInput.value = data.phone;
                }
                if (data.warning) {
                    showMessage('Aviso: O banco de dados precisa ser atualizado para suportar esta função.', 'warning');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    async function saveSettings(phone) {
        const token = await window.Clerk.session.getToken();
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone })
        });

        if (!response.ok) {
            throw new Error('Falha ao salvar');
        }
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.style.display = 'block';
        messageDiv.className = type === 'error' ? 'error-message' : (type === 'warning' ? 'warning-message' : 'success-message');
        
        // Estilos inline básicos para feedback
        if (type === 'success') {
            messageDiv.style.color = 'green';
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderRadius = '5px';
        } else if (type === 'error') {
            messageDiv.style.color = 'red';
            messageDiv.style.backgroundColor = '#f8d7da';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderRadius = '5px';
        } else {
            messageDiv.style.color = '#856404';
            messageDiv.style.backgroundColor = '#fff3cd';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderRadius = '5px';
        }

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
});
