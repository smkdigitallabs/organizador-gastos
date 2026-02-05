
import { Clerk } from '@clerk/clerk-sdk-node';
import { checkAllowlist } from '../lib/auth-utils.js';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
    // Configuração CORS
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://organizador-gastos-br.vercel.app'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. Validar Método
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Autenticação (CRÍTICO: Validar Usuário)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const claims = await clerk.verifyToken(token);
            const userId = claims.sub;

            // Security: Check Allowlist
            const { allowed, email } = await checkAllowlist(userId, clerk);
            if (!allowed) {
                return res.status(403).json({ error: 'Access Denied: Email not authorized', email });
            }
        } catch (authError) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const { itemId, accountId } = req.body;
        const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
        const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Missing Pluggy credentials');
        }

        if (!itemId && !accountId) {
            return res.status(400).json({ error: 'itemId or accountId required' });
        }

        // 3. Authenticate Pluggy
        const authResponse = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET })
        });

        if (!authResponse.ok) throw new Error('Auth failed');
        const { apiKey } = await authResponse.json();

        // 4. Fetch Accounts (if itemId provided)
        let accounts = [];
        if (itemId) {
            const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
                headers: { 'X-API-KEY': apiKey }
            });
            const accountsData = await accountsResponse.json();
            accounts = accountsData.results || [];
        } else if (accountId) {
            accounts = [{ id: accountId }];
        }

        // 5. Fetch Transactions
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        const fromString = fromDate.toISOString().split('T')[0];
        
        let allTransactions = [];

        for (const acc of accounts) {
            const txResponse = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}&from=${fromString}`, {
                headers: { 'X-API-KEY': apiKey }
            });
            
            if (txResponse.ok) {
                const txData = await txResponse.json();
                const transactions = txData.results || [];
                const enriched = transactions.map(tx => ({
                    ...tx,
                    _accountName: acc.name,
                    _accountNumber: acc.number
                }));
                allTransactions = allTransactions.concat(enriched);
            }
        }

        return res.status(200).json({ transactions: allTransactions });

    } catch (error) {
        console.error('Sync Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
