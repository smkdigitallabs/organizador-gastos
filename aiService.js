/**
 * Serviço de Inteligência Artificial para Análise Financeira
 * Responsável por processar dados e gerar recomendações personalizadas
 */
class AIService {
    constructor() {
        this.version = '1.0.0';
    }

    /**
     * Analisa os dados do usuário e gera recomendações
     * @param {Object} data - Objeto contendo expenses, income, etc.
     * @returns {Array} Lista de recomendações
     */
    analyzeUserData(data) {
        const recommendations = [];
        const { expenses = [], income = [] } = data;
        
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            // Filtrar dados do mês atual
            const currentMonthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() + 1 === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            });
            
            const currentMonthIncome = income.filter(inc => {
                const incomeDate = new Date(inc.date);
                return incomeDate.getMonth() + 1 === currentMonth && 
                       incomeDate.getFullYear() === currentYear;
            });
            
            const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            const totalIncome = currentMonthIncome.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
            
            // Executar análises
            this.analyzeTrends(expenses, recommendations);
            this.analyzeCategoryImpact(currentMonthExpenses, totalExpenses, recommendations);
            
            const fixedExpensesTotal = currentMonthExpenses
                .filter(exp => exp.type === 'fixa')
                .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            
            this.determineFinancialProfile(fixedExpensesTotal, totalExpenses, totalIncome, recommendations);
            this.checkFinancialGoals(totalExpenses, recommendations);
            this.predictMonthEnd(totalExpenses, totalIncome, currentMonth, currentYear, recommendations);
            
            const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) : 0;
            this.checkAchievements(expenseRatio, recommendations);
            
            this.compareWithPreviousMonth(expenses, totalExpenses, currentMonth, currentYear, recommendations);
            
        } catch (error) {
            console.error('[AIService]: Erro na análise de dados:', error);
            recommendations.push({
                type: 'warning',
                title: 'Erro na Análise',
                message: 'Não foi possível analisar todos os dados. Verifique se há informações suficientes.'
            });
        }
        
        return recommendations;
    }

    analyzeTrends(expensesData, recommendations) {
        try {
            const last3Months = [];
            const currentDate = new Date();
            
            for (let i = 2; i >= 0; i--) {
                const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthExpenses = expensesData.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === monthDate.getMonth() && 
                           expenseDate.getFullYear() === monthDate.getFullYear();
                });
                
                const total = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                last3Months.push(total);
            }
            
            if (last3Months.length >= 2) {
                const trend = last3Months[last3Months.length - 1] - last3Months[last3Months.length - 2];
                
                if (trend > 0) {
                    recommendations.push({
                        type: 'warning',
                        title: 'Tendência de Aumento',
                        message: `Seus gastos aumentaram R$ ${trend.toFixed(2)} em relação ao mês anterior. Considere revisar suas despesas.`
                    });
                } else if (trend < 0) {
                    recommendations.push({
                        type: 'success',
                        title: 'Economia Detectada',
                        message: `Parabéns! Você economizou R$ ${Math.abs(trend).toFixed(2)} em relação ao mês anterior.`
                    });
                }
            }
        } catch (error) {
            console.error('[AIService]: Erro na análise de tendências:', error);
        }
    }

    analyzeCategoryImpact(currentMonthExpenses, totalExpenses, recommendations) {
        try {
            const categoryTotals = {};
            
            currentMonthExpenses.forEach(expense => {
                const category = expense.category || 'outros';
                categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.amount);
            });
            
            const sortedCategories = Object.entries(categoryTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3);
            
            if (sortedCategories.length > 0) {
                const topCategory = sortedCategories[0];
                const percentage = totalExpenses > 0 ? ((topCategory[1] / totalExpenses) * 100).toFixed(1) : 0;
                
                recommendations.push({
                    type: 'info',
                    title: 'Categoria Dominante',
                    message: `${percentage}% dos seus gastos são em "${topCategory[0]}" (R$ ${topCategory[1].toFixed(2)}). Considere otimizar esta categoria.`
                });
            }
        } catch (error) {
            console.error('[AIService]: Erro na análise de categorias:', error);
        }
    }

    determineFinancialProfile(fixedExpensesTotal, totalExpenses, totalIncome, recommendations) {
        try {
            const fixedPercentage = totalExpenses > 0 ? (fixedExpensesTotal / totalExpenses) * 100 : 0;
            const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
            
            if (fixedPercentage > 70) {
                recommendations.push({
                    type: 'warning',
                    title: 'Alto Comprometimento Fixo',
                    message: `${fixedPercentage.toFixed(1)}% dos seus gastos são fixos. Considere renegociar contratos ou buscar alternativas mais econômicas.`
                });
            } else if (fixedPercentage < 30 && totalExpenses > 0) {
                recommendations.push({
                    type: 'success',
                    title: 'Boa Flexibilidade',
                    message: `Apenas ${fixedPercentage.toFixed(1)}% dos seus gastos são fixos. Você tem boa margem para ajustes no orçamento.`
                });
            }
            
            if (expenseRatio > 90) {
                recommendations.push({
                    type: 'error',
                    title: 'Alerta Crítico',
                    message: `Você está gastando ${expenseRatio.toFixed(1)}% da sua renda. É urgente reduzir despesas ou aumentar a renda.`
                });
            } else if (expenseRatio < 70 && totalIncome > 0) {
                recommendations.push({
                    type: 'success',
                    title: 'Situação Saudável',
                    message: `Você gasta ${expenseRatio.toFixed(1)}% da sua renda. Continue assim e considere investir a diferença.`
                });
            }
        } catch (error) {
            console.error('[AIService]: Erro na determinação do perfil:', error);
        }
    }

    checkFinancialGoals(totalExpenses, recommendations) {
        try {
            // Meta simples: não gastar mais que R$ 3000 por mês
            // TODO: Tornar configurável pelo usuário
            const monthlyGoal = 3000;
            
            if (totalExpenses > monthlyGoal) {
                const excess = totalExpenses - monthlyGoal;
                recommendations.push({
                    type: 'warning',
                    title: 'Meta Ultrapassada',
                    message: `Você ultrapassou a meta mensal em R$ ${excess.toFixed(2)}. Considere ajustar seus gastos.`
                });
            } else {
                const remaining = monthlyGoal - totalExpenses;
                recommendations.push({
                    type: 'success',
                    title: 'Dentro da Meta',
                    message: `Parabéns! Você ainda tem R$ ${remaining.toFixed(2)} disponíveis na sua meta mensal.`
                });
            }
        } catch (error) {
            console.error('[AIService]: Erro na verificação de metas:', error);
        }
    }

    predictMonthEnd(totalExpenses, totalIncome, currentMonth, currentYear, recommendations) {
        try {
            const currentDate = new Date();
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            const daysPassed = currentDate.getDate();
            const daysRemaining = daysInMonth - daysPassed;
            
            if (daysRemaining > 0 && daysPassed > 0) {
                const dailyAverage = totalExpenses / daysPassed;
                const projectedTotal = dailyAverage * daysInMonth;
                
                if (projectedTotal > totalIncome && totalIncome > 0) {
                    const deficit = projectedTotal - totalIncome;
                    recommendations.push({
                        type: 'warning',
                        title: 'Projeção de Déficit',
                        message: `Com base no seu ritmo atual, você pode ter um déficit de R$ ${deficit.toFixed(2)} no fim do mês.`
                    });
                } else if (totalIncome > 0) {
                    const surplus = totalIncome - projectedTotal;
                    recommendations.push({
                        type: 'success',
                        title: 'Projeção Positiva',
                        message: `Mantendo o ritmo atual, você pode economizar R$ ${surplus.toFixed(2)} este mês.`
                    });
                }
            }
        } catch (error) {
            console.error('[AIService]: Erro na previsão:', error);
        }
    }

    checkAchievements(expenseRatio, recommendations) {
        try {
            if (expenseRatio < 0.5 && expenseRatio > 0) {
                recommendations.push({
                    type: 'success',
                    title: '🏆 Conquista Desbloqueada',
                    message: 'Poupador Expert! Você gasta menos de 50% da sua renda.'
                });
            } else if (expenseRatio < 0.7 && expenseRatio > 0) {
                recommendations.push({
                    type: 'success',
                    title: '🏆 Conquista Desbloqueada',
                    message: 'Controlador Financeiro! Você mantém seus gastos abaixo de 70% da renda.'
                });
            }
        } catch (error) {
            console.error('[AIService]: Erro na verificação de conquistas:', error);
        }
    }

    compareWithPreviousMonth(expensesData, totalExpenses, currentMonth, currentYear, recommendations) {
        try {
            const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            
            const previousMonthExpenses = expensesData.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() + 1 === previousMonth && 
                       expenseDate.getFullYear() === previousYear;
            });
            
            const previousTotal = previousMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            
            if (previousTotal > 0) {
                const difference = totalExpenses - previousTotal;
                const percentageChange = ((difference / previousTotal) * 100).toFixed(1);
                
                if (difference > 0) {
                    recommendations.push({
                        type: 'info',
                        title: 'Comparação Mensal',
                        message: `Seus gastos aumentaram ${percentageChange}% em relação ao mês anterior (+R$ ${difference.toFixed(2)}).`
                    });
                } else if (difference < 0) {
                    recommendations.push({
                        type: 'success',
                        title: 'Comparação Mensal',
                        message: `Seus gastos diminuíram ${Math.abs(percentageChange)}% em relação ao mês anterior (-R$ ${Math.abs(difference).toFixed(2)}).`
                    });
                }
            }
        } catch (error) {
            console.error('[AIService]: Erro na comparação mensal:', error);
        }
    }
}

// Inicializa o serviço globalmente
window.aiService = new AIService();