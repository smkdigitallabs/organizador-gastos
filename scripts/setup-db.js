
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  console.log('Iniciando setup do banco de dados...');
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executando schema.sql...');
    await db.query(schema);
    
    console.log('Setup concluído com sucesso!');
  } catch (error) {
    console.error('Erro no setup:', error);
    process.exit(1);
  }
}

setup();
