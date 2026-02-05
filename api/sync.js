
import db from '../lib/db.js';
import { Clerk } from '@clerk/clerk-sdk-node';
import { checkAllowlist } from '../lib/auth-utils.js';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async (req, res) => {
  // Configuração CORS
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
      res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, User-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Autenticação via Clerk
  let userId;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No token provided');
    } else {
        const token = authHeader.split(' ')[1];
        // Verificar token
        // Nota: verifyToken valida a assinatura e expiração
        const decoded = await clerk.verifyToken(token);
        userId = decoded.sub;

        // Security: Check Allowlist
        const { allowed, email } = await checkAllowlist(userId, clerk);
        if (!allowed) {
            console.warn(`[SECURITY] Blocked unauthorized access attempt by ${email || userId}`);
            return res.status(403).json({ error: 'Access Denied: Email not authorized', email });
        }
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({ error: 'Unauthorized', details: error.message });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await db.query('SELECT * FROM user_data WHERE user_id = $1', [userId]);
      
      if (rows.length === 0) {
        // Retornar estrutura vazia padrão se usuário não existir
        return res.status(200).json({
          expenses: [],
          incomes: [],
          cards: [],
          expense_categories: [],
          income_categories: [],
          achievements: [],
          monthly_goal: 0
        });
      }

      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST') {
      const data = req.body;
      
      // Upsert (Inserir ou Atualizar)
      const query = `
        INSERT INTO user_data (
          user_id, 
          expenses, 
          incomes, 
          cards, 
          expense_categories, 
          income_categories, 
          achievements, 
          monthly_goal,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          expenses = EXCLUDED.expenses,
          incomes = EXCLUDED.incomes,
          cards = EXCLUDED.cards,
          expense_categories = EXCLUDED.expense_categories,
          income_categories = EXCLUDED.income_categories,
          achievements = EXCLUDED.achievements,
          monthly_goal = EXCLUDED.monthly_goal,
          updated_at = NOW();
      `;

      const values = [
        userId,
        JSON.stringify(data.expensesData || []),
        JSON.stringify(data.incomeData || []),
        JSON.stringify(data.cards || []),
        JSON.stringify(data.categories?.expense || []),
        JSON.stringify(data.categories?.income || []),
        JSON.stringify(data.achievements || []),
        data.monthlyGoal || 0
      ];

      await db.query(query, values);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
