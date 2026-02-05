
import db from '../../lib/db.js';
import { parseMessage } from '../../lib/whatsapp-parser.js';
import crypto from 'crypto';

/**
 * WhatsApp Cloud API Webhook Handler
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export default async (req, res) => {
    // 1. Configurar CORS e Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // =========================================================================
    // VERIFICAÇÃO DO WEBHOOK (GET)
    // O Facebook envia uma requisição GET para verificar se o endpoint é válido.
    // =========================================================================
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Defina este token no seu painel do Facebook e no .env (ou hardcoded aqui para teste)
        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'organizador_gastos_token_secreto';

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('[WEBHOOK] Verificado com sucesso!');
                return res.status(200).send(challenge);
            } else {
                console.warn('[WEBHOOK] Falha na verificação de token.');
                return res.status(403).end();
            }
        }
        return res.status(400).end();
    }

    // =========================================================================
    // RECEBIMENTO DE MENSAGENS (POST)
    // =========================================================================
    if (req.method === 'POST') {
        try {
            const body = req.body;

            // Log para debug (ajuda a ver o payload real)
            // console.log('[WEBHOOK] Payload recebido:', JSON.stringify(body, null, 2));

            // Verifica se é um evento do WhatsApp
            if (body.object === 'whatsapp_business_account') {
                if (!body.entry || !body.entry[0].changes || !body.entry[0].changes[0].value.messages) {
                    // É um evento de status ou outro tipo que não nos interessa agora
                    return res.status(200).send('EVENT_RECEIVED');
                }

                const entry = body.entry[0];
                const changes = entry.changes[0];
                const value = changes.value;
                const message = value.messages[0];

                // Extrair número de telefone do remetente
                // O formato vem como "5511999999999"
                const from = message.from; 
                
                // Extrair texto da mensagem
                let messageBody = '';
                if (message.type === 'text') {
                    messageBody = message.text.body;
                } else {
                    // Ignorar áudio, imagem, etc. por enquanto
                    console.log('[WEBHOOK] Tipo de mensagem não suportado:', message.type);
                    return res.status(200).send('EVENT_RECEIVED');
                }

                console.log(`[WEBHOOK] Mensagem de ${from}: ${messageBody}`);

                // ---------------------------------------------------------
                // LÓGICA DE NEGÓCIO (Igual à anterior, adaptada)
                // ---------------------------------------------------------

                // 1. Buscar usuário pelo telefone
                // Remove caracteres não numéricos apenas por segurança
                const phone = from.replace(/\D/g, '');

                const { rows } = await db.query('SELECT user_id FROM user_data WHERE phone = $1', [phone]);
                
                if (rows.length === 0) {
                    console.warn(`[WEBHOOK] Usuário não encontrado para o telefone ${phone}`);
                    // Opcional: Responder no WhatsApp dizendo que não está cadastrado (exige API de envio)
                    return res.status(200).send('EVENT_RECEIVED');
                }

                const userId = rows[0].user_id;

                // 2. Parsear Mensagem
                const parsedData = parseMessage(messageBody);
                
                if (!parsedData || parsedData.error) {
                    console.warn(`[WEBHOOK] Não foi possível entender a mensagem: ${messageBody}`);
                    return res.status(200).send('EVENT_RECEIVED');
                }

                // 3. Salvar no Banco
                const newItem = {
                    id: crypto.randomUUID(),
                    description: parsedData.description,
                    amount: parsedData.amount,
                    date: new Date().toISOString(),
                    category: 'Outros', // Categoria padrão
                    paymentMethod: parsedData.source || 'Dinheiro',
                    synced: true,
                    origin: 'whatsapp' // Marcador para saber a origem
                };

                const column = parsedData.type === 'expense' ? 'expenses' : 'incomes';

                await db.query(`
                    UPDATE user_data 
                    SET ${column} = ${column} || $1::jsonb,
                        updated_at = NOW()
                    WHERE user_id = $2
                `, [JSON.stringify([newItem]), userId]);

                console.log(`[WEBHOOK] ${parsedData.type} salva com sucesso para ${userId}`);

                return res.status(200).send('EVENT_RECEIVED');
            } else {
                return res.status(404).end();
            }
        } catch (error) {
            console.error('[WEBHOOK] Erro fatal:', error);
            // Retornar 200 mesmo com erro para evitar retentativas infinitas do Facebook
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    return res.status(405).end();
};
