/**
 * Módulo de Atualização de Dashboard - Versão Segura
 * Função extraída para eliminar dependências circulares
 * @author Sistema de Debug Especializado
 * @version 2.0.0
 */

/**
 * Atualiza os cards do dashboard com dados filtrados
 * @param {Array} expensesData - Dados de despesas
 * @param {Array} incomeData - Dados de receitas
 * @param {string} month - Mês selecionado
 * @param {string} year - Ano selecionado
 */
function updateDashboardCards(expensesData, incomeData, month, year) {
    try {
        // Verificar se estamos na página do dashboard
        const firstCard = document.querySelector('.card:nth-child(1) .amount');
        if (!firstCard) {
            console.log('[DASHBOARD]: Cards não encontrados, não é página do dashboard');
            return;
        }

        // Filtrar receitas do mês
        const currentMonthIncome = incomeData
            .filter(item => {
                try {
                    const [y, m] = item.date.split('T')[0].split('-');
                    return parseInt(m) === parseInt(month) && parseInt(y) === parseInt(year);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar data da receita:', item.date, error);
                    return false;
                }
            })
            .reduce((total, item) => {
                try {
                    return total + parseFloat(item.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar valor da receita:', item.amount, error);
                    return total;
                }
            }, 0);

        // Filtrar TODAS as despesas do mês (como array)
        const currentMonthExpensesArray = expensesData
            .filter(item => {
                try {
                    const [y, m] = item.date.split('T')[0].split('-');
                    return parseInt(m) === parseInt(month) && 
                           parseInt(y) === parseInt(year) &&
                           item.category !== 'investimentos';
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar data da despesa:', item.date, error);
                    return false;
                }
            });
        
        // Calcular o total das despesas (como número)
        const currentMonthExpenses = currentMonthExpensesArray
            .reduce((total, item) => {
                try {
                    return total + parseFloat(item.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar valor da despesa:', item.amount, error);
                    return total;
                }
            }, 0);

        // Filtrar gastos no débito
        const currentMonthDebitExpenses = expensesData
            .filter(item => {
                try {
                    const [y, m] = item.date.split('T')[0].split('-');
                    return parseInt(m) === parseInt(month) && 
                           parseInt(y) === parseInt(year) &&
                           item.paymentMethod === 'debito';
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar débito:', item, error);
                    return false;
                }
            })
            .reduce((total, item) => {
                try {
                    return total + parseFloat(item.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar valor do débito:', item.amount, error);
                    return total;
                }
            }, 0);

        // Filtrar gastos no crédito
        const currentMonthCreditExpenses = expensesData
            .filter(item => {
                try {
                    const [y, m] = item.date.split('T')[0].split('-');
                    return parseInt(m) === parseInt(month) && 
                           parseInt(y) === parseInt(year) &&
                           (item.paymentMethod === 'credito_vista' || 
                            item.paymentMethod === 'credito_parcelado');
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar crédito:', item, error);
                    return false;
                }
            })
            .reduce((total, item) => {
                try {
                    return total + parseFloat(item.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar valor do crédito:', item.amount, error);
                    return total;
                }
            }, 0);

        // Filtrar investimentos
        const currentMonthInvestments = expensesData
            .filter(item => {
                try {
                    const [y, m] = item.date.split('T')[0].split('-');
                    return parseInt(m) === parseInt(month) && 
                           parseInt(y) === parseInt(year) &&
                           item.category === 'investimentos';
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar investimento:', item, error);
                    return false;
                }
            })
            .reduce((total, item) => {
                try {
                    return total + parseFloat(item.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar valor do investimento:', item.amount, error);
                    return total;
                }
            }, 0);

        // Atualizar os valores nos cards com tratamento de erro
        try {
            const cards = [
                { selector: '.card:nth-child(1) .amount', value: currentMonthIncome, label: 'Receitas' },
                { selector: '.card:nth-child(2) .amount', value: currentMonthExpenses, label: 'Despesas' },
                { selector: '.card:nth-child(3) .amount', value: currentMonthDebitExpenses, label: 'Débito' },
                { selector: '.card:nth-child(4) .amount', value: currentMonthCreditExpenses, label: 'Crédito' },
                { selector: '.card:nth-child(5) .amount', value: currentMonthInvestments, label: 'Investimentos' }
            ];

            cards.forEach(card => {
                const element = document.querySelector(card.selector);
                if (element) {
                    element.textContent = `R$ ${card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                } else {
                    console.warn(`[DASHBOARD]: Card não encontrado: ${card.label} (${card.selector})`);
                }
            });

            // Calcular o valor "GUARDEI" (Renda - Despesas - Investimentos)
            const savedAmount = currentMonthIncome - currentMonthExpenses - currentMonthInvestments;
            const savedCard = document.querySelector('.card:nth-child(6) .amount');
            if (savedCard) {
                savedCard.textContent = `R$ ${savedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            } else {
                console.warn('[DASHBOARD]: Card "Guardei" não encontrado');
            }

        } catch (error) {
            console.error('[DASHBOARD]: Erro ao atualizar cards:', error);
        }

        // Atualizar listas de despesas fixas e variáveis
        updateExpenseLists(currentMonthExpensesArray, currentMonthIncome);

        // Atualizar gráfico de gastos mensais
        updateMonthlyChart(expensesData, year);

        // Gerar recomendações de IA
        if (typeof generateAIRecommendations === 'function') {
            generateAIRecommendations();
        }

        console.log(`[DASHBOARD]: Dashboard atualizado para ${month}/${year}`);

    } catch (error) {
        console.error('[DASHBOARD]: Erro crítico ao atualizar dashboard:', error);
        
        // Emitir evento de erro se EventBus estiver disponível
        if (typeof eventBus !== 'undefined') {
            eventBus.emit('system:error', {
                type: 'dashboard_update_error',
                message: 'Erro ao atualizar dashboard',
                error: error.message
            });
        }
    }
}

/**
 * Atualiza as listas de despesas fixas e variáveis
 */
function updateExpenseLists(expensesArray, monthlyIncome) {
    try {
        // Atualizar lista de despesas fixas
        const fixedExpensesList = document.getElementById('fixed-expenses-list');
        if (fixedExpensesList) {
            fixedExpensesList.innerHTML = '';

            const fixedExpensesItems = expensesArray.filter(item => 
                item.expenseType === 'fixa'
            );

            let totalFixed = 0;
            fixedExpensesItems.forEach(expense => {
                try {
                    const listItem = document.createElement('li');
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'expense-icon';
                    iconSpan.textContent = getCategoryIcon(expense.category);
                    
                    const descSpan = document.createElement('span');
                    descSpan.className = 'expense-description';
                    descSpan.textContent = expense.description;
                    
                    const amountSpan = document.createElement('span');
                    amountSpan.className = 'expense-amount';
                    amountSpan.textContent = `R$ ${parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    
                    listItem.appendChild(iconSpan);
                    listItem.appendChild(descSpan);
                    listItem.appendChild(amountSpan);
                    fixedExpensesList.appendChild(listItem);
                    totalFixed += parseFloat(expense.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar despesa fixa:', expense, error);
                }
            });

            // Atualizar barra de progresso das despesas fixas
            const progressBar = document.querySelector('.progress');
            if (progressBar && monthlyIncome > 0) {
                const progressPercentage = (totalFixed / monthlyIncome * 100) || 0;
                progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
                progressBar.textContent = `${Math.round(progressPercentage)}%`;
            }
        }

        // Atualizar lista de despesas variáveis
        const variableExpensesList = document.getElementById('variable-expenses-list');
        if (variableExpensesList) {
            variableExpensesList.innerHTML = '';
            
            const variableExpensesItems = expensesArray.filter(item => 
                item.expenseType === 'variavel'
            );

            let totalVariable = 0;
            variableExpensesItems.forEach(expense => {
                try {
                    const listItem = document.createElement('li');
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'expense-icon';
                    iconSpan.textContent = getCategoryIcon(expense.category);
                    
                    const descSpan = document.createElement('span');
                    descSpan.className = 'expense-description';
                    descSpan.textContent = expense.description;
                    
                    const amountSpan = document.createElement('span');
                    amountSpan.className = 'expense-amount';
                    amountSpan.textContent = `R$ ${parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    
                    listItem.appendChild(iconSpan);
                    listItem.appendChild(descSpan);
                    listItem.appendChild(amountSpan);
                    
                    variableExpensesList.appendChild(listItem);
                    totalVariable += parseFloat(expense.amount);
                } catch (error) {
                    console.warn('[DASHBOARD]: Erro ao processar despesa variável:', expense, error);
                }
            });

            // Atualizar barra de progresso das despesas variáveis
            const variableProgressBar = document.getElementById('variable-progress');
            if (variableProgressBar && monthlyIncome > 0) {
                const variableProgressPercentage = (totalVariable / monthlyIncome * 100) || 0;
                variableProgressBar.style.width = `${Math.min(variableProgressPercentage, 100)}%`;
                variableProgressBar.textContent = `${Math.round(variableProgressPercentage)}%`;
            }
        }

    } catch (error) {
        console.error('[DASHBOARD]: Erro ao atualizar listas de despesas:', error);
    }
}

/**
 * Atualiza o gráfico de gastos mensais
 */
function updateMonthlyChart(expensesData, year) {
    try {
        const monthlyExpenses = Array(12).fill(0);
        const monthNames = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];

        expensesData.forEach(expense => {
            try {
                const [y, m] = expense.date.split('T')[0].split('-');
                if (parseInt(y) === parseInt(year)) {
                    const monthIndex = parseInt(m) - 1;
                    if (monthIndex >= 0 && monthIndex < 12) {
                        monthlyExpenses[monthIndex] += parseFloat(expense.amount);
                    }
                }
            } catch (error) {
                console.warn('[DASHBOARD]: Erro ao processar despesa para gráfico:', expense, error);
            }
        });

        const maxExpense = Math.max(...monthlyExpenses, 1);

        const chartBarsContainer = document.querySelector('.chart-bars');
        if (chartBarsContainer) {
            chartBarsContainer.innerHTML = '';

            monthlyExpenses.forEach((expense, index) => {
                const barContainer = document.createElement('div');
                barContainer.className = 'bar-container';
                
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${(expense / maxExpense) * 100}%`;
                
                const label = document.createElement('div');
                label.className = 'bar-label';
                label.textContent = monthNames[index];
                
                barContainer.appendChild(bar);
                barContainer.appendChild(label);
                chartBarsContainer.appendChild(barContainer);
            });
        }

    } catch (error) {
        console.error('[DASHBOARD]: Erro ao atualizar gráfico mensal:', error);
    }
}

/**
 * Obtém ícone da categoria (função auxiliar)
 */
function getCategoryIcon(category) {
    const icons = {
        'alimentacao': '🍽️',
        'transporte': '🚗',
        'moradia': '🏠',
        'saude': '🏥',
        'educacao': '📚',
        'lazer': '🎮',
        'vestuario': '👕',
        'investimentos': '💰',
        'outros': '📦'
    };
    return icons[category] || '📦';
}