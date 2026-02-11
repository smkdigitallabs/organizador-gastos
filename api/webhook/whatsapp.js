
import db from '../../lib/db.js';
import { parseMessage } from '../../lib/whatsapp-parser.js';
import crypto from 'crypto';

// Disable default body parser to verify signature
export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(req) {
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }
    return Buffer.concat(buffers);
}

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

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
        if (!VERIFY_TOKEN) {
            console.error('[WEBHOOK] WHATSAPP_VERIFY_TOKEN não definido no .env');
            return res.status(500).end();
        }

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
            const rawBodyBuffer = await getRawBody(req);
            const rawBodyString = rawBodyBuffer.toString('utf8');
            
            // VERIFICAÇÃO DE ASSINATURA (X-Hub-Signature-256)
            const signature = req.headers['x-hub-signature-256'];
            const appSecret = process.env.WHATSAPP_APP_SECRET;

            if (appSecret && signature) {
                const signatureHash = signature.split('sha256=')[1];
                const expectedHash = crypto
                    .createHmac('sha256', appSecret)
                    .update(rawBodyBuffer)
                    .digest('hex');

                if (signatureHash !== expectedHash) {
                    console.error('[WEBHOOK] Assinatura inválida!');
                    return res.status(403).send('INVALID_SIGNATURE');
                }
            } else if (!appSecret) {
                console.warn('[WEBHOOK] WHATSAPP_APP_SECRET não definido. Ignorando verificação (INSEGURO).');
            }

            const body = JSON.parse(rawBodyString);

            // Verifica se é um evento do WhatsApp
            if (body.object === 'whatsapp_business_account') {
                if (
                    !body.entry || 
                    !body.entry[0] || 
                    !body.entry[0].changes || 
                    !body.entry[0].changes[0] || 
                    !body.entry[0].changes[0].value || 
                    !body.entry[0].changes[0].value.messages
                ) {
                    return res.status(200).send('EVENT_RECEIVED');
                }

                const entry = body.entry[0];
                const changes = entry.changes[0];
                const value = changes.value;
                const message = value.messages[0];
                const from = message.from; 
                
                let messageBody = '';
                if (message.type === 'text') {
                    messageBody = message.text.body;
                } else {
                    console.log('[WEBHOOK] Tipo de mensagem não suportado:', message.type);
                    return res.status(200).send('TYPE_NOT_SUPPORTED');
                }
                
                // TODO: Processar mensagem (salvar no banco, etc.)
                // Aqui entraria a lógica de parsing e inserção no DB
                console.log(`[WEBHOOK] Mensagem de ${from}: ${messageBody}`);
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (error) {
            console.error('[WEBHOOK] Erro ao processar mensagem:', error);
            return res.status(500).send('ERROR_PROCESSING_MESSAGE');
        }
    }
};
