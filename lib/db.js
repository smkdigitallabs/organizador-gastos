
import pg from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const { Pool } = pg;

// Verificar se a URL do banco de dados está definida
if (!process.env.DATABASE_URL) {
  console.warn('[DB]: DATABASE_URL não definida. Verifique o arquivo .env');
} else {
  // Verificar região (Solicitação do usuário: verificar se é São Paulo)
  // Neon usa 'aws' e a região na URL, ex: ep-xyz.sa-east-1.aws.neon.tech
  if (!process.env.DATABASE_URL.includes('sa-east-1')) {
    console.warn('----------------------------------------------------------------');
    console.warn('[ATENÇÃO]: A região do Neon não parece ser São Paulo (sa-east-1).');
    console.warn('URL atual:', process.env.DATABASE_URL.split('@')[1] || 'Oculta');
    console.warn('Recomendado: Criar projeto na região sa-east-1 para menor latência.');
    console.warn('----------------------------------------------------------------');
  } else {
    console.log('[DB]: Região São Paulo (sa-east-1) detectada corretamente.');
  }

  // Verificar Connection Pooling (Importante para Vercel/Serverless)
  if (!process.env.DATABASE_URL.includes('-pooler')) {
    console.warn('----------------------------------------------------------------');
    console.warn('[ATENÇÃO]: A URL do banco não parece estar usando Connection Pooling.');
    console.warn('Neon recomenda usar a URL "Pooled" em ambientes Serverless como Vercel.');
    console.warn('Dica: No dashboard do Neon, copie a Connection String que diz "Pooled connection".');
    console.warn('Isso evita erros de "too many connections" e melhora a performance.');
    console.warn('----------------------------------------------------------------');
  } else {
    console.log('[DB]: Connection Pooling detectado corretamente.');
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const query = (text, params) => pool.query(text, params);

export default {
  query
};
