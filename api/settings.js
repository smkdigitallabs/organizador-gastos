
import db from '../lib/db.js';
import { Clerk } from '@clerk/clerk-sdk-node';
import { checkAllowlist } from '../lib/auth-utils.js';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async (req, res) => {
    // CORS
    // Em produção, substitua '*' pelo domínio do seu frontend (ex: https://seu-app.vercel.app)
    // Se estiver usando credenciais (cookies/auth headers), '*' não é permitido com credentials: true
    // Como estamos usando Bearer token via Header Authorization, credentials: true pode não ser estritamente necessário se não houver cookies.
    // Mas para segurança, vamos permitir apenas a origem correta ou refletir a origem se for confiável.
    
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://organizador-gastos-br.vercel.app',
        'https://organizador-de-gastos.vercel.app'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Fallback seguro ou '*' se não usar credentials
        // res.setHeader('Access-Control-Allow-Origin', '*'); 
        // Como o frontend envia credentials (auth header), vamos refletir se for dev, ou bloquear se não estiver na lista.
        // Para simplificar neste momento e evitar quebra, vamos permitir * MAS remover credentials true se for *
        res.setHeader('Access-Control-Allow-Origin', '*');
        // res.setHeader('Access-Control-Allow-Credentials', true); // Removido para segurança com *
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Auth
    let userId;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = await clerk.verifyToken(token);
        userId = decoded.sub;

        // Security Check
        const { allowed } = await checkAllowlist(userId, clerk);
        if (!allowed) {
            return res.status(403).json({ error: 'Access Denied' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized', details: error.message });
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await db.query('SELECT phone FROM user_data WHERE user_id = $1', [userId]);
            if (rows.length === 0) {
                return res.status(200).json({ phone: '' });
            }
            return res.status(200).json({ phone: rows[0].phone || '' });
        } catch (error) {
            console.error('Settings GET Error:', error);
            // If column doesn't exist, return empty
            if (error.code === '42703') { // undefined_column
                return res.status(200).json({ phone: '', warning: 'Schema outdated' });
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    if (req.method === 'POST') {
        const { phone } = req.body;
        
        // Basic validation
        // Remove non-digits
        const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

        try {
            // Check if column exists by trying to update
            await db.query(`
                INSERT INTO user_data (user_id, phone)
                VALUES ($1, $2)
                ON CONFLICT (user_id)
                DO UPDATE SET phone = EXCLUDED.phone
            `, [userId, cleanPhone]);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Settings POST Error:', error);
            if (error.code === '42703') { // undefined_column
                 return res.status(500).json({ error: 'Database schema needs update (missing phone column)' });
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
