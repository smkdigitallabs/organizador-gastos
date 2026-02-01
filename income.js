document.addEventListener('DOMContentLoaded', function() {
    const incomeForm = document.getElementById('incomeForm');
    const fixedIncomeList = document.getElementById('fixedIncomeList');
    const variableIncomeList = document.getElementById('variableIncomeList');

    // Carregar receitas existentes
    function loadIncomes() {
        const fixedIncomeList = document.getElementById('fixedIncomeList');
        const variableIncomeList = document.getElementById('variableIncomeList');
        
        if (!fixedIncomeList || !variableIncomeList) return;
        
        // Usar DataManager para obter dados com fallback
        let incomes = [];
        if (typeof dataManager !== 'undefined') {
            incomes = dataManager.getIncomes();
        } else {
            incomes = JSON.parse(localStorage.getItem('incomeData') || '[]');
        }

        fixedIncomeList.innerHTML = '';
        variableIncomeList.innerHTML = '';
        
        const currentMonth = document.getElementById('month')?.value || new Date().getMonth() + 1;
        const currentYear = document.getElementById('year')?.value || new Date().getFullYear();
        
        incomes.forEach((income, index) => {
            const incomeDate = new Date(income.date);
            if (incomeDate.getMonth() + 1 == currentMonth && 
                incomeDate.getFullYear() == currentYear) {
                const incomeElement = createIncomeElement(income, index);
                if (income.incomeType === 'fixa') {
                    fixedIncomeList.appendChild(incomeElement);
                } else {
                    variableIncomeList.appendChild(incomeElement);
                }
            }
        });
    }

    function createIncomeElement(income, index) {
        const div = document.createElement('div');
        div.className = 'income-item';
        
        // Criação segura de elementos DOM para prevenir XSS
        const infoDiv = document.createElement('div');
        infoDiv.className = 'income-info';
        
        const h3 = document.createElement('h3');
        h3.textContent = income.description;
        
        const pCategory = document.createElement('p');
        pCategory.className = 'category';
        pCategory.textContent = income.category;
        
        const pAmount = document.createElement('p');
        pAmount.className = 'amount';
        pAmount.textContent = `R$ ${parseFloat(income.amount).toFixed(2)}`;
        
        const pDate = document.createElement('p');
        pDate.className = 'date';
        pDate.textContent = new Date(income.date).toLocaleDateString();
        
        infoDiv.appendChild(h3);
        infoDiv.appendChild(pCategory);
        infoDiv.appendChild(pAmount);
        infoDiv.appendChild(pDate);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'income-actions';
        
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.innerHTML = '<i class="fas fa-edit"></i>'; // Ícones são seguros
        btnEdit.onclick = () => editIncome(index);
        
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.innerHTML = '<i class="fas fa-trash"></i>'; // Ícones são seguros
        btnDelete.onclick = () => deleteIncome(index);
        
        actionsDiv.appendChild(btnEdit);
        actionsDiv.appendChild(btnDelete);
        
        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        
        return div;
    }

    // Adicionar nova receita
    incomeForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('amount').value);
        const dateInput = document.getElementById('date').value; // Formato: YYYY-MM-DD
        const [year, month, day] = dateInput.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Criar data usando componentes locais
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zerar as horas para comparação apenas de data
        date.setHours(0, 0, 0, 0); // Zerar as horas da data selecionada

        if (amount <= 0) {
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', 'O valor deve ser maior que zero', 'error');
            } else if (typeof showNotification === 'function') {
                showNotification('O valor deve ser maior que zero', 'error');
            } else {
                console.error('ERRO: O valor deve ser maior que zero');
                alert('O valor deve ser maior que zero');
            }
            return;
        }

        // Verificar se é data futura
        if (date > today) {
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', 'A data não pode ser futura', 'error');
            } else if (typeof showNotification === 'function') {
                showNotification('A data não pode ser futura', 'error');
            } else {
                console.error('ERRO: A data não pode ser futura');
                alert('A data não pode ser futura');
            }
            return;
        }

        const income = {
            description: document.getElementById('description').value,
            amount: amount,
            date: document.getElementById('date').value + 'T00:00:00.000Z', // Adiciona horário UTC
            category: document.getElementById('category').value,
            incomeType: document.getElementById('isFixed').checked ? 'fixa' : 'variavel',
        };

        let incomes = [];
        if (typeof dataManager !== 'undefined') {
            incomes = dataManager.getIncomes();
        } else {
            incomes = JSON.parse(localStorage.getItem('incomeData') || '[]');
        }

        const editIndex = incomeForm.dataset.editIndex;

        if (editIndex !== undefined) {
            // Editar receita existente
            incomes[editIndex] = income;
            delete incomeForm.dataset.editIndex; // Limpar o índice de edição
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', 'Receita atualizada com sucesso!', 'success');
            } else if (typeof showNotification === 'function') {
                showNotification('Receita atualizada com sucesso!', 'success');
            } else {
                console.log('SUCESSO: Receita atualizada com sucesso!');
            }
            document.getElementById('addIncomeBtn').textContent = 'Adicionar Receita'; // Restaurar texto do botão
        } else {
            // Adicionar nova receita
            incomes.push(income);
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', '✅ Receita adicionada com sucesso!', 'success');
            } else if (typeof showNotification === 'function') {
                showNotification('✅ Receita adicionada com sucesso!', 'success');
            } else {
                console.log('SUCESSO: ✅ Receita adicionada com sucesso!');
            }
        }
        
        if (typeof dataManager !== 'undefined') {
            dataManager.saveIncomes(incomes);
        } else {
            localStorage.setItem('incomeData', JSON.stringify(incomes));
        }

        incomeForm.reset();
        // Reset date to today
        document.getElementById('date').valueAsDate = new Date();
        loadIncomes();
    });

    // Função para excluir receita
    window.deleteIncome = function(index) {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            let incomes = [];
            if (typeof dataManager !== 'undefined') {
                incomes = dataManager.getIncomes();
            } else {
                incomes = JSON.parse(localStorage.getItem('incomeData') || '[]');
            }
            
            incomes.splice(index, 1);
            
            if (typeof dataManager !== 'undefined') {
                dataManager.saveIncomes(incomes);
            } else {
                localStorage.setItem('incomeData', JSON.stringify(incomes));
            }
            
            loadIncomes();
            
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', 'Receita excluída com sucesso!', 'success');
            } else if (typeof showNotification === 'function') {
                showNotification('Receita excluída com sucesso!', 'success');
            }
        }
    }

    // Atualizar lista quando mudar o mês ou ano
    const monthSelect = document.getElementById('month');
    const yearInput = document.getElementById('year');
    
    if (monthSelect && yearInput) {
        monthSelect.addEventListener('change', loadIncomes);
        yearInput.addEventListener('change', loadIncomes);
    }

    // Carregar receitas ao iniciar
    loadIncomes();
    loadIncomeCategories();

    // Event listeners para o dropdown customizado
    const categorySelected = document.getElementById('category-selected');
    if (categorySelected) {
        categorySelected.addEventListener('click', toggleIncomeCategoryDropdown);
    }
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('category-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            closeIncomeCategoryDropdown();
        }
    });
});

// Função para carregar categorias (ESCOPO GLOBAL)
function loadIncomeCategories() {
    let categories = [];
    if (typeof dataManager !== 'undefined') {
        categories = dataManager.getIncomeCategories();
    } else {
        categories = JSON.parse(localStorage.getItem('income-categories')) || [
            'Salário',
            'Freelance', 
            'Investimentos',
            'Poupança',
            'Outros'
        ];
    }

    const categoryOptions = document.getElementById('category-options');
    if (!categoryOptions) return;
    
    categoryOptions.innerHTML = '';

    // Adicionar categorias existentes com ícone de lixeira
    categories.forEach(category => {
        const option = document.createElement('div');
        option.className = 'category-option';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name';
        nameSpan.textContent = category;
        
        const deleteSpan = document.createElement('span');
        deleteSpan.className = 'category-delete';
        deleteSpan.textContent = '🗑️';
        deleteSpan.title = 'Excluir categoria';
        deleteSpan.onclick = (event) => deleteIncomeCategory(category, event);
        
        option.appendChild(nameSpan);
        option.appendChild(deleteSpan);
        
        // Adicionar evento de clique para selecionar categoria
        option.addEventListener('click', function(e) {
            if (!e.target.classList.contains('category-delete')) {
                selectIncomeCategory(category);
            }
        });
        
        categoryOptions.appendChild(option);
    });
    
    // Adicionar opção para nova categoria
    const addNewOption = document.createElement('div');
    addNewOption.className = 'category-option add-new';
    
    const addNewSpan = document.createElement('span');
    addNewSpan.className = 'category-name';
    addNewSpan.textContent = '+ Adicionar nova categoria';
    
    addNewOption.appendChild(addNewSpan);
    addNewOption.addEventListener('click', function() {
        addNewIncomeCategory();
    });
    categoryOptions.appendChild(addNewOption);
}

// Função para selecionar categoria (ESCOPO GLOBAL)
function selectIncomeCategory(category) {
    document.getElementById('category').value = category;
    document.getElementById('category-selected').querySelector('span').textContent = category;
    closeIncomeCategoryDropdown();
}

// Função para abrir/fechar dropdown (ESCOPO GLOBAL)
function toggleIncomeCategoryDropdown() {
    const dropdown = document.getElementById('category-dropdown');
    dropdown.classList.toggle('open');
}

function closeIncomeCategoryDropdown() {
    document.getElementById('category-dropdown').classList.remove('open');
}

// Função para excluir categoria (ESCOPO GLOBAL)
function deleteIncomeCategory(categoryToDelete, event) {
    event.stopPropagation();
    
    if (confirm(`Tem certeza que deseja excluir a categoria "${categoryToDelete}"?`)) {
        let categories = [];
        if (typeof dataManager !== 'undefined') {
            categories = dataManager.getIncomeCategories();
        } else {
            categories = JSON.parse(localStorage.getItem('income-categories')) || [];
        }
        
        const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
        
        if (typeof dataManager !== 'undefined') {
            dataManager.saveIncomeCategories(updatedCategories);
        } else {
            localStorage.setItem('income-categories', JSON.stringify(updatedCategories));
        }
        
        loadIncomeCategories();
        
        const currentCategory = document.getElementById('category').value;
        if (currentCategory === categoryToDelete) {
            document.getElementById('category').value = '';
            document.getElementById('category-selected').querySelector('span').textContent = 'Selecione uma categoria';
        }
        
        // Verificação segura de função global
        if (typeof safeCall !== 'undefined') {
            safeCall('showNotification', `🗑️ Categoria "${categoryToDelete}" excluída!`, 'info');
        } else if (typeof showNotification === 'function') {
            showNotification(`🗑️ Categoria "${categoryToDelete}" excluída!`, 'info');
        } else {
            console.log(`INFO: 🗑️ Categoria "${categoryToDelete}" excluída!`);
        }
    }
}

// Função para adicionar nova categoria (ESCOPO GLOBAL)
function addNewIncomeCategory() {
    const newCategory = prompt('Digite o nome da nova categoria:');

    if (newCategory && newCategory.trim()) {
        const categoryName = newCategory.trim();
        const wasAdded = addIncomeCategoryIfNotExists(categoryName);
        
        if (wasAdded) {
            selectIncomeCategory(categoryName);
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', `✅ Nova categoria "${categoryName}" criada e selecionada!`, 'success');
            } else if (typeof showNotification === 'function') {
                showNotification(`✅ Nova categoria "${categoryName}" criada e selecionada!`, 'success');
            } else {
                console.log(`SUCESSO: ✅ Nova categoria "${categoryName}" criada e selecionada!`);
            }
        } else {
            selectIncomeCategory(categoryName);
            // Verificação segura de função global
            if (typeof safeCall !== 'undefined') {
                safeCall('showNotification', `ℹ️ Categoria "${categoryName}" já existia e foi selecionada!`, 'info');
            } else if (typeof showNotification === 'function') {
                showNotification(`ℹ️ Categoria "${categoryName}" já existia e foi selecionada!`, 'info');
            } else {
                console.log(`INFO: ℹ️ Categoria "${categoryName}" já existia e foi selecionada!`);
            }
        }
    }
    closeIncomeCategoryDropdown();
}

// Função para adicionar categoria se não existir (ESCOPO GLOBAL)
function addIncomeCategoryIfNotExists(categoryName) {
    let categories = [];
    if (typeof dataManager !== 'undefined') {
        categories = dataManager.getIncomeCategories();
    } else {
        categories = JSON.parse(localStorage.getItem('income-categories')) || [];
    }

    if (!categories.includes(categoryName)) {
        categories.push(categoryName);
        
        if (typeof dataManager !== 'undefined') {
            dataManager.saveIncomeCategories(categories);
        } else {
            localStorage.setItem('income-categories', JSON.stringify(categories));
        }
        
        loadIncomeCategories();
        return true;
    }
    return false;
}

// Função para editar receita
window.editIncome = function(index) {
    let incomes = [];
    if (typeof dataManager !== 'undefined') {
        incomes = dataManager.getIncomes();
    } else {
        incomes = JSON.parse(localStorage.getItem('incomeData') || '[]');
    }
    
    const incomeToEdit = incomes[index];

    // Preencher o formulário com os dados da receita
    document.getElementById('description').value = incomeToEdit.description;
    document.getElementById('amount').value = incomeToEdit.amount;
    document.getElementById('date').value = incomeToEdit.date.split('T')[0]; // Apenas a data
    document.getElementById('category').value = incomeToEdit.category;
    document.getElementById('isFixed').checked = incomeToEdit.incomeType === 'fixa';
    
    // Atualizar visual da categoria selecionada
    if (document.getElementById('category-selected')) {
        document.getElementById('category-selected').querySelector('span').textContent = incomeToEdit.category;
    }

    // Armazenar o índice da receita que está sendo editada
    document.getElementById('incomeForm').dataset.editIndex = index;

    // Mudar o texto do botão de submissão
    document.getElementById('addIncomeBtn').textContent = 'Salvar Edição';
    // Verificação segura de função global
    if (typeof safeCall !== 'undefined') {
        safeCall('showNotification', 'Editando receita. Salve as alterações!', 'info');
    } else if (typeof showNotification === 'function') {
        showNotification('Editando receita. Salve as alterações!', 'info');
    } else {
        console.log('INFO: Editando receita. Salve as alterações!');
    }
}
