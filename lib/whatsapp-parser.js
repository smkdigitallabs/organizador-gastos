/**
 * WhatsApp Message Parser
 * Parses natural language messages into structured financial data.
 * 
 * Supported formats examples:
 * - "Gastei 50 no almoço com nubank" -> { type: 'expense', amount: 50, description: 'almoço', source: 'nubank' }
 * - "Entrou 1000 de salario no itau" -> { type: 'income', amount: 1000, description: 'salario', source: 'itau' }
 * - "50 almoço" -> { type: 'expense', amount: 50, description: 'almoço', source: null }
 */

export function parseMessage(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }

    const lowerMsg = message.toLowerCase().trim();
    
    // Default values
    let type = 'expense'; // Default to expense
    let amount = 0;
    let description = '';
    let source = null; // Card or Account name

    // 1. Detect Type (Income vs Expense)
    if (lowerMsg.includes('recebi') || lowerMsg.includes('ganhei') || lowerMsg.includes('entrou') || lowerMsg.includes('deposito')) {
        type = 'income';
    }

    // 2. Extract Amount
    // Matches: R$ 50,00 | 50.00 | 50
    const amountMatch = lowerMsg.match(/r?\$?\s?(\d+([.,]\d{1,2})?)/);
    if (amountMatch) {
        // Normalize 50,00 to 50.00
        let amountStr = amountMatch[1].replace(',', '.');
        amount = parseFloat(amountStr);
    } else {
        return { error: 'Valor não encontrado' };
    }

    // 3. Extract Source (Card/Bank)
    // Keywords: "no", "na", "pelo", "pela", "via", "com" followed by word
    // Example: "no nubank", "via pix"
    const sourceMatch = lowerMsg.match(/\b(no|na|pelo|pela|via|com|cart[ãa]o)\s+([\w\d]+)/);
    if (sourceMatch) {
        source = sourceMatch[2]; // The word after the preposition
    }

    // 4. Extract Description
    // Remove detected parts to leave the description
    let cleanMsg = lowerMsg;
    
    // Remove amount (original match)
    if (amountMatch) {
        cleanMsg = cleanMsg.replace(amountMatch[0], '');
    }

    // Remove source pattern
    if (sourceMatch) {
        cleanMsg = cleanMsg.replace(sourceMatch[0], '');
    }

    // Remove common verbs/filler words
    const fillers = ['gastei', 'compra', 'de', 'foi', 'recebi', 'ganhei', 'entrou', 'deposito', 'r$'];
    fillers.forEach(word => {
        cleanMsg = cleanMsg.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    // Clean up extra spaces and punctuation
    description = cleanMsg.replace(/[.,\-]/g, ' ').trim();
    
    // Capitalize first letter of description
    if (description.length > 0) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    } else {
        description = type === 'expense' ? 'Despesa diversa' : 'Entrada diversa';
    }

    return {
        type,
        amount,
        description,
        source,
        raw: message,
        date: new Date().toISOString()
    };
}
