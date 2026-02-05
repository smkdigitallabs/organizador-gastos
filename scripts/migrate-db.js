
import db from '../lib/db.js';

async function migrate() {
    console.log('Iniciando migração do banco de dados...');
    try {
        await db.query(`
            ALTER TABLE user_data 
            ADD COLUMN IF NOT EXISTS phone TEXT;
        `);
        
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_user_data_phone ON user_data(phone);
        `);
        
        console.log('Migração concluída com sucesso!');
    } catch (error) {
        console.error('Erro na migração:', error);
    }
}

migrate();
