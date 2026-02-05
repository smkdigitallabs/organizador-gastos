
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
            // Verifica a assinatura e expiração do token JWT
            const claims = await clerk.verifyToken(token);
            const userId = claims.sub;

            // Security: Check Allowlist
            const { allowed, email } = await checkAllowlist(userId, clerk);
            if (!allowed) {
                return response.status(403).json({ error: 'Access Denied: Email not authorized', email });
            }
        } catch (authError) {
            console.error('Auth verification failed:', authError);
            return response.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // 3. Credenciais do Pluggy
        const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
        const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Missing Pluggy credentials in server environment');
        }

        // 4. Authenticate with Pluggy to get API Key
        const authResponse = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET
            })
        });

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            throw new Error(`Pluggy Auth failed: ${authResponse.status} ${errorText}`);
        }

        const authData = await authResponse.json();
        const apiKey = authData.apiKey;

        // 5. Create Connect Token
        const tokenResponse = await fetch('https://api.pluggy.ai/connect_tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({
                options: {
                    // Usar um identificador opaco para privacidade
                    clientUserId: 'user_' + Date.now() 
                }
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Pluggy Connect Token failed: ${tokenResponse.status} ${errorText}`);
        }

        const tokenData = await tokenResponse.json();

        return response.status(200).json({ 
            accessToken: tokenData.accessToken 
        });

    } catch (error) {
        console.error('API Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
