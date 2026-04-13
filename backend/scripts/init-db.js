/**
 * Inicializa o schema do PostgreSQL usando DATABASE_URL do .env.
 */

require('dotenv').config();

const db = require('../db/database');

db.ready
  .then(async () => {
    console.log('Schema PostgreSQL inicializado com sucesso.');
    await db.close();
  })
  .catch(async (err) => {
    console.error('Erro ao inicializar schema PostgreSQL:', err.message);
    await db.close().catch(() => {});
    process.exitCode = 1;
  });
