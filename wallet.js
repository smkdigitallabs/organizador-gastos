document.addEventListener('DOMContentLoaded', function() {
    const cardForm = document.getElementById('cardForm');
    const cardsList = document.getElementById('cardsList');

    // Carregar cartões existentes
    // Função para calcular o consumo do cartão
    function calculateCardUsage(cardName) {
        const expensesData = typeof dataManager !== 'undefined' ? 
            dataManager.getExpenses() : 
            JSON.parse(localStorage.getItem('expensesData') || '[]');
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        return expensesData
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expense.selectedCard === cardName &&
                       (expense.paymentMethod === 'credito_vista' || expense.paymentMethod === 'credito_parcelado') &&
                       expenseDate.getMonth() + 1 === currentMonth &&
                       expenseDate.getFullYear() === currentYear;
            })
            .reduce((total, expense) => total + expense.amount, 0);
    }
    
    // Modificar a função loadCards para incluir a barra de consumo
    function loadCards() {
        const cards = typeof dataManager !== 'undefined' ? 
            dataManager.getCards() : 
            JSON.parse(localStorage.getItem('cards') || '[]');
        cardsList.innerHTML = '';
    
        if (cards.length === 0) {
            cardsList.innerHTML = '<p class="no-cards">Nenhum cartão cadastrado ainda.</p>';
            return;
        }
    
        // Criar container grid para os cartões
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';
    
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `credit-card ${card.type}`;
            
            // Calcular consumo do cartão
            const usedAmount = calculateCardUsage(card.name);
            const usagePercentage = card.limit > 0 ? (usedAmount / card.limit) * 100 : 0;
            const remainingLimit = card.limit - usedAmount;
            
            // Determinar ícone do tipo de cartão
            const typeIcon = getCardTypeIcon(card.type);
            
            // Determinar label do tipo
            const typeLabel = getCardTypeLabel(card.type);
            
            // cardElement.innerHTML substituição segura
            const patternDiv = document.createElement('div');
            patternDiv.className = 'card-pattern';
            cardElement.appendChild(patternDiv);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-card';
            deleteBtn.onclick = () => deleteCard(index);
            const trashIcon = document.createElement('i');
            trashIcon.className = 'fas fa-trash';
            deleteBtn.appendChild(trashIcon);
            actionsDiv.appendChild(deleteBtn);
            cardElement.appendChild(actionsDiv);
            
            const chipDiv = document.createElement('div');
            chipDiv.className = 'card-chip';
            cardElement.appendChild(chipDiv);
            
            const typeIconDiv = document.createElement('div');
            typeIconDiv.className = 'card-type-icon';
            const typeIconI = document.createElement('i');
            typeIconI.className = typeIcon;
            typeIconDiv.appendChild(typeIconI);
            cardElement.appendChild(typeIconDiv);
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'card-name';
            nameDiv.textContent = card.name;
            cardElement.appendChild(nameDiv);
            
            const typeLabelDiv = document.createElement('div');
            typeLabelDiv.className = 'card-type-label';
            typeLabelDiv.textContent = typeLabel;
            cardElement.appendChild(typeLabelDiv);
            
            const datesDiv = document.createElement('div');
            datesDiv.className = 'card-dates';
            let datesText = '';
            if (card.closingDay) datesText += `Fechamento: ${card.closingDay.toString().padStart(2, '0')}`;
            if (card.dueDay) datesText += `${datesText ? ' | ' : ''}Vencimento: ${card.dueDay.toString().padStart(2, '0')}`;
            datesDiv.textContent = datesText;
            cardElement.appendChild(datesDiv);
            
            if (card.limit > 0) {
                const usageDiv = document.createElement('div');
                usageDiv.className = 'card-usage';
                
                const usageInfo = document.createElement('div');
                usageInfo.className = 'usage-info';
                
                const usageLabel = document.createElement('span');
                usageLabel.className = 'usage-label';
                usageLabel.textContent = `Usado: R$ ${usedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                
                const remainingLabel = document.createElement('span');
                remainingLabel.className = 'remaining-label';
                remainingLabel.textContent = `Disponível: R$ ${remainingLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                
                usageInfo.appendChild(usageLabel);
                usageInfo.appendChild(remainingLabel);
                usageDiv.appendChild(usageInfo);
                
                const usageBar = document.createElement('div');
                usageBar.className = 'usage-bar';
                const usageFill = document.createElement('div');
                usageFill.className = 'usage-fill';
                usageFill.style.width = `${Math.min(usagePercentage, 100)}%`;
                usageBar.appendChild(usageFill);
                usageDiv.appendChild(usageBar);
                
                const usagePerc = document.createElement('div');
                usagePerc.className = 'usage-percentage';
                usagePerc.textContent = `${usagePercentage.toFixed(1)}% usado`;
                usageDiv.appendChild(usagePerc);
                
                cardElement.appendChild(usageDiv);
                
                const limitDiv = document.createElement('div');
                limitDiv.className = 'card-limit';
                
                const limitLabel = document.createElement('span');
                limitLabel.className = 'limit-label';
                limitLabel.textContent = 'LIMITE TOTAL';
                
                const limitValue = document.createElement('span');
                limitValue.className = 'limit-value';
                limitValue.textContent = `R$ ${card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                
                limitDiv.appendChild(limitLabel);
                limitDiv.appendChild(limitValue);
                cardElement.appendChild(limitDiv);
            }
            
            const brandDiv = document.createElement('div');
            brandDiv.className = 'card-brand';
            brandDiv.textContent = getCardBrand(card.type);
            cardElement.appendChild(brandDiv);
            
            cardsGrid.appendChild(cardElement);
        });
        
        cardsList.appendChild(cardsGrid);
    }

    // Função para obter ícone do tipo de cartão
    function getCardTypeIcon(type) {
        const icons = {
            'credito': 'fas fa-credit-card',
            'debito': 'fas fa-money-check-alt',
            'multiplo': 'fas fa-credit-card'
        };
        return icons[type] || 'fas fa-credit-card';
    }

    // Função para obter label do tipo de cartão
    function getCardTypeLabel(type) {
        const labels = {
            'credito': 'Cartão de Crédito',
            'debito': 'Cartão de Débito',
            'multiplo': 'Cartão Múltiplo'
        };
        return labels[type] || 'Cartão';
    }

    // Função para obter marca do cartão
    function getCardBrand(type) {
        const brands = {
            'credito': 'CREDIT',
            'debito': 'DEBIT',
            'multiplo': 'MULTI'
        };
        return brands[type] || 'CARD';
    }

    // Adicionar novo cartão
    cardForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const closingDay = parseInt(document.getElementById('closingDay').value);
        const dueDay = parseInt(document.getElementById('dueDay').value);

        if (closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31) {
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', 'Os dias de fechamento e vencimento devem estar entre 1 e 31', 'error');
            } else if (typeof showNotification === 'function') {
                showNotification('Os dias de fechamento e vencimento devem estar entre 1 e 31', 'error');
            } else {
                console.error('ERRO: Os dias de fechamento e vencimento devem estar entre 1 e 31');
                alert('Os dias de fechamento e vencimento devem estar entre 1 e 31');
            }
            return;
        }

        const card = {
            name: document.getElementById('cardName').value,
            type: document.getElementById('cardType').value,
            limit: parseFloat(document.getElementById('cardLimit').value) || 0,
            closingDay: parseInt(document.getElementById('closingDay').value) || 0,
            dueDay: parseInt(document.getElementById('dueDay').value) || 0
        };

        const cards = typeof dataManager !== 'undefined' ? 
            dataManager.getCards() : 
            JSON.parse(localStorage.getItem('cards') || '[]');
        cards.push(card);
        
        if (typeof dataManager !== 'undefined') {
            dataManager.saveCards(cards);
        } else {
            localStorage.setItem('cards', JSON.stringify(cards));
        }

        cardForm.reset();
        loadCards();
        // Verificação segura de função global
        if (typeof safeCall !== 'undefined') {
            safeCall('showNotification', 'Cartão adicionado com sucesso!');
        } else if (typeof showNotification === 'function') {
            showNotification('Cartão adicionado com sucesso!');
        } else {
            console.log('SUCESSO: Cartão adicionado com sucesso!');
        }
    });

    // Função para excluir cartão
    window.deleteCard = function(index) {
        if (confirm('Tem certeza que deseja excluir este cartão?')) {
            const cards = typeof dataManager !== 'undefined' ? 
                dataManager.getCards() : 
                JSON.parse(localStorage.getItem('cards') || '[]');
            cards.splice(index, 1);
            
            if (typeof dataManager !== 'undefined') {
                dataManager.saveCards(cards);
            } else {
                localStorage.setItem('cards', JSON.stringify(cards));
            }
            loadCards();
        }
    };

    // Carregar cartões ao iniciar
    loadCards();
});