
/**
 * Bank Statement Parser
 * Responsável por ler e processar arquivos de extrato bancário (OFX e CSV)
 */
export class BankStatementParser {
    constructor() {
        this.supportedExtensions = ['ofx', 'csv'];
    }

    /**
     * Processa um arquivo de extrato
     * @param {File} file Arquivo selecionado pelo usuário
     * @returns {Promise<Array>} Lista de transações normalizadas
     */
    async parseFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!this.supportedExtensions.includes(extension)) {
            throw new Error(`Formato .${extension} não suportado. Use OFX ou CSV.`);
        }

        const text = await this.readFileAsText(file);

        if (extension === 'ofx') {
            return this.parseOFX(text);
        } else if (extension === 'csv') {
            return this.parseCSV(text);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Parser básico de OFX (Open Financial Exchange)
     * Extrai transações usando Regex para evitar dependências pesadas de XML
     */
    parseOFX(ofxData) {
        const transactions = [];
        
        // Regex para capturar blocos de transação <STMTTRN>...</STMTTRN>
        const transactionBlocks = ofxData.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);

        if (!transactionBlocks) return [];

        transactionBlocks.forEach(block => {
            try {
                // Extrair campos
                const typeMatch = block.match(/<TRNTYPE>(.*?)(\r|\n|<)/);
                const dateMatch = block.match(/<DTPOSTED>(.*?)(\r|\n|<)/);
                const amountMatch = block.match(/<TRNAMT>(.*?)(\r|\n|<)/);
                const memoMatch = block.match(/<MEMO>(.*?)(\r|\n|<)/);
                
                if (dateMatch && amountMatch) {
                    const rawDate = dateMatch[1].trim();
                    const amount = parseFloat(amountMatch[1].replace(',', '.'));
                    const description = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';
                    const type = typeMatch ? typeMatch[1].trim() : 'OTHER';

                    // Formatar data (OFX format: YYYYMMDDHHMMSS)
                    const year = rawDate.substring(0, 4);
                    const month = rawDate.substring(4, 6);
                    const day = rawDate.substring(6, 8);
                    const formattedDate = `${year}-${month}-${day}`;

                    // Converter para formato do app
                    // Se valor negativo = despesa (Expense)
                    // Se valor positivo = receita (Income) - mas aqui vamos tratar tudo como transação para classificar
                    
                    transactions.push({
                        date: formattedDate,
                        description: description,
                        amount: Math.abs(amount),
                        type: amount < 0 ? 'DEBIT' : 'CREDIT', // DEBIT aqui significa saída de dinheiro
                        rawType: type,
                        source: 'OFX_IMPORT'
                    });
                }
            } catch (e) {
                console.warn('Erro ao processar linha do OFX:', e);
            }
        });

        return transactions;
    }

    /**
     * Parser básico de CSV
     * Tenta inferir colunas comuns (Data, Descrição, Valor)
     */
    parseCSV(csvData) {
        const lines = csvData.split(/\r\n|\n/);
        const transactions = [];
        
        // Tentar detectar separador (; ou ,)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';

        // Pular cabeçalho (assumindo linha 1)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(separator);
            
            // Heurística simples: 
            // Geralmente: Data (0), Descrição (1 ou 2), Valor (último ou penúltimo)
            // Isso pode variar muito de banco para banco. 
            // Implementação genérica para Nubank/Inter (comuns)
            
            if (columns.length >= 3) {
                try {
                    // Tenta achar a data (formato DD/MM/YYYY ou YYYY-MM-DD)
                    let date = columns[0]; // Assume primeira coluna
                    
                    // Ajuste de formato de data BR para ISO
                    if (date.includes('/')) {
                        const parts = date.split('/');
                        if (parts.length === 3) {
                            date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    }

                    // Tenta achar valor (procura numérico)
                    let amount = 0;
                    let description = 'Importado CSV';

                    // Procura coluna de valor (tem números e pode ter sinal)
                    for (let j = 1; j < columns.length; j++) {
                        const col = columns[j].trim();
                        // Regex simples para moeda
                        if (col.match(/^-?\d+([.,]\d+)?$/)) {
                            amount = parseFloat(col.replace(',', '.'));
                        } else if (col.length > 3 && !col.match(/^\d+$/)) {
                            description = col; // Assume texto longo como descrição
                        }
                    }

                    if (amount !== 0) {
                        transactions.push({
                            date: date,
                            description: description.replace(/"/g, ''),
                            amount: Math.abs(amount),
                            type: amount < 0 ? 'DEBIT' : 'CREDIT',
                            source: 'CSV_IMPORT'
                        });
                    }
                } catch (e) {
                    console.warn('Erro ao processar linha CSV:', e);
                }
            }
        }

        return transactions;
    }
}

export const bankStatementParser = new BankStatementParser();
