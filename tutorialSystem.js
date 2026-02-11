
/**
 * Tutorial System
 * Provides a guided tour with highlights and dynamic information.
 */

export class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.tourData = [];
        this.overlay = null;
        this.tooltip = null;
        this.highlight = null;
        this.setupOverlay();
    }

    setupOverlay() {
        if (document.getElementById('tutorial-overlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.className = 'tutorial-overlay';
        
        this.highlight = document.createElement('div');
        this.highlight.className = 'tutorial-highlight';
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tutorial-tooltip';
        
        this.overlay.appendChild(this.highlight);
        this.overlay.appendChild(this.tooltip);
        document.body.appendChild(this.overlay);

        // Close on overlay click (optional)
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.endTour();
        };
    }

    startTour(sectionId) {
        this.tourData = this.getTourData(sectionId);
        if (this.tourData.length === 0) return;
        
        this.currentStep = 0;
        this.overlay.classList.add('active');
        this.showStep();
    }

    showStep() {
        const step = this.tourData[this.currentStep];
        const element = document.querySelector(step.selector);

        if (!element) {
            console.warn(`Element not found: ${step.selector}`);
            this.nextStep();
            return;
        }

        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight
        const rect = element.getBoundingClientRect();
        const padding = 10;
        
        this.highlight.style.width = `${rect.width + padding * 2}px`;
        this.highlight.style.height = `${rect.height + padding * 2}px`;
        this.highlight.style.top = `${rect.top + window.scrollY - padding}px`;
        this.highlight.style.left = `${rect.left + window.scrollX - padding}px`;

        // Tooltip Content
        this.tooltip.innerHTML = `
            <div class="tutorial-content">
                <h4>${step.title}</h4>
                <p>${step.content}</p>
            </div>
            <div class="tutorial-actions">
                <span>${this.currentStep + 1} / ${this.tourData.length}</span>
                <div>
                    ${this.currentStep > 0 ? '<button class="tutorial-prev">Anterior</button>' : ''}
                    <button class="tutorial-next">${this.currentStep === this.tourData.length - 1 ? 'Finalizar' : 'Próximo'}</button>
                </div>
            </div>
        `;

        // Tooltip Position
        this.positionTooltip(rect);

        // Events
        const nextBtn = this.tooltip.querySelector('.tutorial-next');
        const prevBtn = this.tooltip.querySelector('.tutorial-prev');

        nextBtn.onclick = () => {
            if (this.currentStep === this.tourData.length - 1) {
                this.endTour();
            } else {
                this.nextStep();
            }
        };

        if (prevBtn) {
            prevBtn.onclick = () => this.prevStep();
        }
    }

    positionTooltip(rect) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const margin = 20;
        
        let top = rect.bottom + window.scrollY + margin;
        let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);

        // Check screen bounds
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - tooltipRect.height - margin;
        }
        
        if (left < margin) left = margin;
        if (left + tooltipRect.width > window.innerWidth - margin) {
            left = window.innerWidth - tooltipRect.width - margin;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
    }

    nextStep() {
        this.currentStep++;
        this.showStep();
    }

    prevStep() {
        this.currentStep--;
        this.showStep();
    }

    endTour() {
        this.overlay.classList.remove('active');
        this.tooltip.style.opacity = '0';
    }

    getTourData(sectionId) {
        const allData = {
            'summary': [
                { selector: '.summary-cards', title: 'Resumo Geral', content: 'Aqui você vê um panorama rápido de suas finanças no mês selecionado.' },
                { selector: '.card:nth-child(1)', title: 'Ganhos', content: 'Total de receitas confirmadas para este mês.' },
                { selector: '.card:nth-child(2)', title: 'Gastos', content: 'Soma de todas as suas despesas, incluindo fixas e variáveis.' }
            ],
            'fixed': [
                { selector: '.fixed-expenses', title: 'Gastos Fixos', content: 'Contas que se repetem todo mês (aluguel, internet, etc). A barra mostra o progresso do pagamento.' }
            ],
            'variable': [
                { selector: '.variable-expenses', title: 'Despesas Variáveis', content: 'Gastos do dia a dia (mercado, lazer). Monitore para não estourar o orçamento!' }
            ],
            'chart': [
                { selector: '.monthly-expenses-chart', title: 'Evolução Mensal', content: 'Compare seus gastos entre os meses para entender seu comportamento financeiro.' }
            ],
            'ai': [
                { selector: '.ai-recommendations', title: 'Inteligência Artificial', content: 'Nossa IA analisa seus hábitos e sugere onde você pode economizar.' }
            ],
            'transactions': [
                { selector: '.details-container', title: 'Lista de Transações', content: 'Aqui você pode ver cada lançamento individualmente, editar ou excluir.' },
                { selector: '#expensesList', title: 'Despesas', content: 'Todas as saídas de dinheiro detalhadas por data e categoria.' },
                { selector: '#incomeList', title: 'Receitas', content: 'Entradas de dinheiro registradas no período.' }
            ],
            'income-form': [
                { selector: '#incomeForm', title: 'Cadastro de Receita', content: 'Preencha os dados do seu ganho aqui.' },
                { selector: '#amount', title: 'Valor', content: 'Insira o valor bruto recebido.' },
                { selector: '#isFixed', title: 'Recorrência', content: 'Marque se este valor cai na sua conta todo mês (ex: salário).' }
            ],
            'expense-form': [
                { selector: '#expenseForm', title: 'Cadastro de Despesa', content: 'Registre seus gastos aqui para manter o controle.' },
                { selector: '#paymentMethod', title: 'Forma de Pagamento', content: 'Selecione como pagou para que possamos organizar seu fluxo de caixa.' },
                { selector: '#isRecurring', title: 'Despesa Recorrente', content: 'Use para gastos que acontecem com frequência mas não são fixos.' }
            ],
            'wallet-form': [
                { selector: '#cardForm', title: 'Meus Cartões', content: 'Cadastre seus cartões para gerenciar limites e faturas.' },
                { selector: '#cardType', title: 'Tipo de Cartão', content: 'Escolha entre Crédito, Débito ou Múltiplo.' },
                { selector: '#closingDay', title: 'Melhor Dia de Compra', content: 'O dia de fechamento ajuda a IA a sugerir o melhor cartão para cada compra.' }
            ],
            'whatsapp': [
                { selector: '#whatsapp-settings-form', title: 'Configurar WhatsApp', content: 'Vincule seu número para enviar gastos por mensagem.' },
                { selector: '.info-text', title: 'Formatos de Mensagem', content: 'Você pode falar naturalmente: "gastei 50 no mercado".' }
            ],
            'bank-sync': [
                { selector: '.bank-integration-section', title: 'Conexão Bancária', content: 'Importe seus dados automaticamente dos bancos.' },
                { selector: '#connect-bank-btn', title: 'Conexão Automática', content: 'Conecte-se de forma segura usando Open Finance para sincronizar contas e cartões.' },
                { selector: '#import-statement-btn', title: 'Importar Extrato', content: 'Se preferir, importe arquivos OFX ou CSV exportados do seu banco.' }
            ]
        };
        return allData[sectionId] || [];
    }
}

export const tutorialSystem = new TutorialSystem();
