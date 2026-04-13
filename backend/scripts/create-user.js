/**
 * Cria ou atualiza um usuario no PostgreSQL.
 *
 * Uso:
 * ADMIN_EMAIL=admin@site.com ADMIN_PASSWORD=senha ADMIN_NAME="Admin" ADMIN_PROFILE=admin node scripts/create-user.js
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../db/database');

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
const profile = process.env.ADMIN_PROFILE?.trim() || 'admin';

const allowedProfiles = new Set(['admin', 'advogado', 'assistente']);

async function main() {
  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o usuario.');
  }

  if (!allowedProfiles.has(profile)) {
    throw new Error('ADMIN_PROFILE deve ser admin, advogado ou assistente.');
  }

  await db.ready;

  const hash = bcrypt.hashSync(password, 10);
  const existing = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);

  if (existing) {
    await db.prepare(`
      UPDATE usuarios
      SET nome = ?, senha = ?, perfil = ?, ativo = 1, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, hash, profile, existing.id);

    console.log(`Usuario atualizado: ${email} (${profile})`);
    return;
  }

  const result = await db.prepare(`
    INSERT INTO usuarios (nome, email, senha, perfil, ativo)
    VALUES (?, ?, ?, ?, 1)
  `).run(name, email, hash, profile);

  console.log(`Usuario criado: ${email} (${profile}) - id ${result.lastInsertRowid}`);
}

main()
  .catch((err) => {
    console.error('Erro ao criar usuario:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
