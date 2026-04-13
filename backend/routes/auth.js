const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { gerarToken, autenticar, exigirPerfil } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email.toLowerCase().trim());

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = gerarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        avatar: usuario.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// GET /auth/me
router.get('/me', autenticar, async (req, res) => {
  const usuario = await db.prepare('SELECT id, nome, email, perfil, avatar, criado_em FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(usuario);
});

// PUT /auth/senha
router.put('/senha', autenticar, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);

    if (!bcrypt.compareSync(senhaAtual, usuario.senha)) {
      return res.status(400).json({ erro: 'Senha atual incorreta' });
    }

    const hash = bcrypt.hashSync(novaSenha, 10);
    await db.prepare('UPDATE usuarios SET senha = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.usuario.id);

    res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar senha' });
  }
});

// GET /auth/usuarios (admin)
router.get('/usuarios', autenticar, exigirPerfil('admin'), async (req, res) => {
  const usuarios = await db.prepare('SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY nome').all();
  res.json(usuarios);
});

// POST /auth/usuarios (admin)
router.post('/usuarios', autenticar, exigirPerfil('admin'), async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    const existe = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase());
    if (existe) return res.status(400).json({ erro: 'Email já cadastrado' });

    const hash = bcrypt.hashSync(senha, 10);
    const result = await db.prepare(`
      INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)
    `).run(nome, email.toLowerCase(), hash, perfil || 'advogado');

    res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Usuário criado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

module.exports = router;
