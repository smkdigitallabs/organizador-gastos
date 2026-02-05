
import { Clerk } from '@clerk/clerk-sdk-node';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(request, response) {
    // 1. Validar Método
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Autenticação (CRÍTICO: Validar Usuário)
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const claims = await clerk.verifyToken(token);
            const userId = claims.sub;

            // Security: Check Allowlist
            const { allowed, email } = await checkAllowlist(userId, clerk);
            if (!allowed) {
                return response.status(403).json({ error: 'Access Denied: Email not authorized', email });
            }
        } catch (authError) {
            return response.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const { itemId, accountId } = request.body;
        const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
        const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Missing Pluggy credentials');
        }

        if (!itemId && !accountId) {
            return response.status(400).json({ error: 'itemId or accountId required' });
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

        return response.status(200).json({ transactions: allTransactions });

    } catch (error) {
        console.error('Sync Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
