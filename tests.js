import { globalFunctionChecker } from './globalFunctionChecker.js';
import { smartAutoSave } from './smartAutoSave.js';
import { safeStorage } from './safeStorage.js';
import { dataManager } from './dataManager.js';

/**
 * Testes de validação para o Organizador de Gastos
 * Verifica se as correções implementadas não quebram funcionalidades existentes
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
        this.testOutput = document.getElementById('test-output') || this.createTestOutputElement();
    }

    /**
     * Cria elemento para exibição dos resultados dos testes
     */
    createTestOutputElement() {
        const output = document.createElement('div');
        output.id = 'test-output';
        output.className = 'test-output';
        output.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 400px;
            max-height: 300px;
            overflow-y: auto;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            z-index: 9999;
        `;
        document.body.appendChild(output);
        return output;
    }

    /**
     * Adiciona um teste à lista de testes
     */
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
        return this;
    }

    /**
     * Executa todos os testes registrados
     */
    async runTests() {
        this.log(`🧪 Iniciando ${this.tests.length} testes...`);
        this.results = { passed: 0, failed: 0, total: this.tests.length };

        for (const test of this.tests) {
            try {
                this.log(`⏳ Executando: ${test.name}`);
                await test.testFn();
                this.results.passed++;
                this.log(`✅ PASSOU: ${test.name}`);
            } catch (error) {
                this.results.failed++;
                this.log(`❌ FALHOU: ${test.name}`);
                this.log(`   Erro: ${error.message}`);
                console.error(`Teste falhou: ${test.name}`, error);
            }
        }

        this.logSummary();
        return this.results;
    }

    /**
     * Registra mensagem no elemento de saída
     */
    log(message) {
        const line = document.createElement('div');
        line.textContent = message;
        this.testOutput.appendChild(line);
        console.log(message);
        this.testOutput.scrollTop = this.testOutput.scrollHeight;
    }

    /**
     * Exibe resumo dos resultados dos testes
     */
    logSummary() {
        const { passed, failed, total } = this.results;
        const summaryLine = document.createElement('div');
        
        const strong = document.createElement('strong');
        strong.textContent = 'Resultados: ';
        
        const text = document.createTextNode(`${passed}/${total} testes passaram (${Math.round((passed/total)*100)}% de sucesso)`);
        
        summaryLine.appendChild(strong);
        summaryLine.appendChild(text);

        summaryLine.style.borderTop = '1px solid #555';
        summaryLine.style.paddingTop = '5px';
        summaryLine.style.marginTop = '5px';
        
        if (failed > 0) {
            summaryLine.style.color = '#ff6b6b';
        } else {
            summaryLine.style.color = '#69db7c';
        }
        
        this.testOutput.appendChild(summaryLine);
    }

    /**
     * Função de asserção para verificar igualdade
     */
    assertEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Esperado: ${JSON.stringify(expected)}, Recebido: ${JSON.stringify(actual)}`);
        }
    }

    /**
     * Função de asserção para verificar se valor é verdadeiro
     */
    assertTrue(value, message) {
        if (!value) {
            throw new Error(message || `Valor esperado verdadeiro, mas recebeu: ${value}`);
        }
    }

    /**
     * Função de asserção para verificar se valor é falso
     */
    assertFalse(value, message) {
        if (value) {
            throw new Error(message || `Valor esperado falso, mas recebeu: ${value}`);
        }
    }

    /**
     * Função de asserção para verificar se função não lança exceção
     */
    assertNoError(fn, message) {
        try {
            fn();
        } catch (error) {
            throw new Error(message || `Função não deveria lançar exceção, mas lançou: ${error.message}`);
        }
    }
}

/**
 * Testes específicos para o sistema
 */
class OrganizadorGastosTestes {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    /**
     * Configura todos os testes
     */
    setupTests() {
        // Testes para GlobalFunctionChecker
        this.setupGlobalFunctionCheckerTests();
        
        // Testes para SmartAutoSave
        this.setupSmartAutoSaveTests();
        
        // Testes para SafeStorage
        this.setupSafeStorageTests();
        
        // Testes para DataManager
        this.setupDataManagerTests();
    }

    /**
     * Configura testes para GlobalFunctionChecker
     */
    setupGlobalFunctionCheckerTests() {
        this.runner.addTest('GlobalFunctionChecker - Verifica existência de função', () => {
            const checker = globalFunctionChecker || {};
            this.runner.assertTrue(
                typeof checker.functionExists === 'function', // functionExists is the method name in the class
                'GlobalFunctionChecker.functionExists deve ser uma função'
            );
            
            // Testar com função existente (window.console.log ainda existe)
            this.runner.assertTrue(
                checker.functionExists('console.log'),
                'Deveria detectar console.log como existente'
            );
            
            // Testar com função inexistente
            this.runner.assertFalse(
                checker.functionExists('funcaoInexistente'),
                'Deveria detectar funcaoInexistente como inexistente'
            );
        });

        this.runner.addTest('GlobalFunctionChecker - Chamada segura de função', () => {
            const checker = globalFunctionChecker || {};
            this.runner.assertTrue(
                typeof checker.safeCall === 'function',
                'GlobalFunctionChecker.safeCall deve ser uma função'
            );
            
            // Testar chamada segura com função existente
            let resultado = checker.safeCall('Math.max', 1, 2, 3);
            this.runner.assertEqual(resultado, 3, 'Math.max(1,2,3) deveria retornar 3');
            
            // Testar chamada segura com função inexistente
            resultado = checker.safeCall('funcaoInexistente', 1, 2, 3);
            this.runner.assertEqual(resultado, undefined, 'Chamada de função inexistente deveria retornar undefined');
        });
    }

    /**
     * Configura testes para SmartAutoSave
     */
    setupSmartAutoSaveTests() {
        this.runner.addTest('SmartAutoSave - Verifica inicialização', () => {
            this.runner.assertTrue(
                typeof smartAutoSave === 'object',
                'Instância de smartAutoSave deve estar disponível'
            );
            
            const autoSave = smartAutoSave;
            this.runner.assertTrue(
                typeof autoSave.start === 'function' && 
                typeof autoSave.stop === 'function' &&
                typeof autoSave.forceSave === 'function',
                'SmartAutoSave deve ter métodos start, stop e forceSave'
            );
        });

        this.runner.addTest('SmartAutoSave - Verifica detecção de atividade', () => {
            const autoSave = smartAutoSave;
            // Simular inatividade primeiro para garantir mudança
            autoSave.state.isUserActive = false;
            
            // Simular atividade
            autoSave.updateActivity();
            
            this.runner.assertTrue(
                autoSave.state.isUserActive,
                'Usuário deve ser marcado como ativo após updateActivity()'
            );
        });
    }

    /**
     * Configura testes para SafeStorage
     */
    setupSafeStorageTests() {
        this.runner.addTest('SafeStorage - Verifica operações básicas', () => {
            this.runner.assertTrue(
                typeof safeStorage === 'object',
                'safeStorage deve estar disponível'
            );
            
            // Testar setItem
            this.runner.assertNoError(() => {
                safeStorage.setItem('teste', 'valor');
            }, 'safeStorage.setItem não deve lançar exceção');
            
            // Testar getItem
            const valor = safeStorage.getItem('teste');
            this.runner.assertEqual(valor, 'valor', 'safeStorage.getItem deve recuperar o valor correto');
            
            // Testar removeItem
            safeStorage.removeItem('teste');
            const valorAposRemocao = safeStorage.getItem('teste');
            this.runner.assertEqual(valorAposRemocao, null, 'safeStorage.removeItem deve remover o item');
        });

        this.runner.addTest('SafeStorage - Verifica tratamento de erros', () => {
            // Testar getItem com chave inexistente
            const valorInexistente = safeStorage.getItem('chaveInexistente');
            this.runner.assertEqual(valorInexistente, null, 'safeStorage.getItem deve retornar null para chave inexistente');
            
            // Testar getObject com JSON inválido
            localStorage.setItem('jsonInvalido', '{invalido}');
            const objetoInvalido = safeStorage.getObject('jsonInvalido');
            this.runner.assertEqual(objetoInvalido, null, 'safeStorage.getObject deve retornar null para JSON inválido');
        });
    }

    /**
     * Configura testes para DataManager
     */
    setupDataManagerTests() {
        this.runner.addTest('DataManager - Verifica inicialização', () => {
            this.runner.assertTrue(
                typeof dataManager === 'object',
                'dataManager deve estar disponível'
            );
            
            this.runner.assertTrue(
                typeof dataManager.autoSave === 'function' &&
                typeof dataManager.getAllData === 'function',
                'dataManager deve ter métodos autoSave e getAllData'
            );
        });

        this.runner.addTest('DataManager - Verifica detecção de mudanças', () => {
            // Verificar se hasUnsavedChanges está disponível
            this.runner.assertTrue(
                typeof dataManager.hasUnsavedChanges === 'function',
                'dataManager.hasUnsavedChanges deve ser uma função'
            );
            
            // Verificar se generateDataHash está disponível
            this.runner.assertTrue(
                typeof dataManager.generateDataHash === 'function',
                'dataManager.generateDataHash deve ser uma função'
            );
            
            // Gerar hash de dados
            const hash = dataManager.generateDataHash();
            this.runner.assertTrue(
                typeof hash === 'string' && hash.length > 0,
                'generateDataHash deve retornar uma string não vazia'
            );
        });
    }

    /**
     * Executa todos os testes
     */
    async runTests() {
        return await this.runner.runTests();
    }
}

// Inicializar e executar testes quando a página estiver carregada
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar um pouco para garantir que todos os scripts foram carregados
    setTimeout(async () => {
        const testes = new OrganizadorGastosTestes();
        await testes.runTests();
    }, 1000);
});

// Disponibilizar globalmente
window.OrganizadorGastosTestes = OrganizadorGastosTestes;
window.dataManager = dataManager;
window.toggleAutoSaveHistory = toggleAutoSaveHistory;
window.loadAutoSaveVersions = loadAutoSaveVersions;