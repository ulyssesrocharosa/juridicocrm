const express = require('express');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// GET /clientes - Listar todos
router.get('/', autenticar, async (req, res) => {
  try {
    const { busca, status, area, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let where = [];
    let params = [];

    if (busca) {
      where.push('(c.nome LIKE ? OR c.cpf_cnpj LIKE ? OR c.email LIKE ? OR c.telefone LIKE ?)');
      const b = `%${busca}%`;
      params.push(b, b, b, b);
    }
    if (status) { where.push('c.status_lead = ?'); params.push(status); }
    if (area) { where.push('c.area_juridica = ?'); params.push(area); }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const clientes = await db.prepare(`
      SELECT c.*,
             u.nome as responsavel_nome,
             COUNT(DISTINCT p.id) as total_processos
      FROM clientes c
      LEFT JOIN usuarios u ON c.responsavel_id = u.id
      LEFT JOIN processos p ON p.cliente_id = c.id
      ${whereStr}
      GROUP BY c.id, u.nome
      ORDER BY c.atualizado_em DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limite), parseInt(offset));

    const total = await db.prepare(`SELECT COUNT(*) as total FROM clientes c ${whereStr}`).get(...params);

    res.json({
      dados: clientes,
      total: total.total,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(total.total / limite)
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /clientes/stats - Estatísticas
router.get('/stats', autenticar, async (req, res) => {
  try {
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status_lead = 'prospecto' THEN 1 ELSE 0 END) as prospectos,
        SUM(CASE WHEN status_lead = 'qualificado' THEN 1 ELSE 0 END) as qualificados,
        SUM(CASE WHEN status_lead = 'ativo' THEN 1 ELSE 0 END) as ativos,
        SUM(CASE WHEN status_lead = 'encerrado' THEN 1 ELSE 0 END) as encerrados,
        SUM(CASE WHEN status_lead = 'perdido' THEN 1 ELSE 0 END) as perdidos,
        SUM(CASE WHEN criado_em >= date('now', '-30 days') THEN 1 ELSE 0 END) as novos_mes
      FROM clientes
    `).get();

    const porArea = await db.prepare(`
      SELECT area_juridica, COUNT(*) as total
      FROM clientes
      WHERE area_juridica IS NOT NULL
      GROUP BY area_juridica
      ORDER BY total DESC
    `).all();

    res.json({ ...stats, por_area: porArea });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /clientes/:id - Detalhe
router.get('/:id', autenticar, async (req, res) => {
  try {
    const cliente = await db.prepare(`
      SELECT c.*, u.nome as responsavel_nome
      FROM clientes c
      LEFT JOIN usuarios u ON c.responsavel_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });

    const processos = await db.prepare('SELECT * FROM processos WHERE cliente_id = ? ORDER BY criado_em DESC').all(req.params.id);
    const anotacoes = await db.prepare(`
      SELECT a.*, u.nome as usuario_nome
      FROM anotacoes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.cliente_id = ?
      ORDER BY a.criado_em DESC
    `).all(req.params.id);

    res.json({ ...cliente, processos, anotacoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /clientes - Criar
router.post('/', autenticar, async (req, res) => {
  try {
    const {
      nome, tipo, cpf_cnpj, email, telefone, celular, whatsapp,
      endereco, cidade, estado, cep, area_juridica, status_lead,
      origem, observacoes, responsavel_id
    } = req.body;

    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

    const result = await db.prepare(`
      INSERT INTO clientes (
        nome, tipo, cpf_cnpj, email, telefone, celular, whatsapp,
        endereco, cidade, estado, cep, area_juridica, status_lead,
        origem, observacoes, responsavel_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome, tipo || 'pf', cpf_cnpj, email, telefone, celular, whatsapp,
      endereco, cidade, estado, cep, area_juridica, status_lead || 'prospecto',
      origem, observacoes, responsavel_id || req.usuario.id
    );

    const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(cliente);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /clientes/:id - Atualizar
router.put('/:id', autenticar, async (req, res) => {
  try {
    const campos = ['nome', 'tipo', 'cpf_cnpj', 'email', 'telefone', 'celular', 'whatsapp',
      'endereco', 'cidade', 'estado', 'cep', 'area_juridica', 'status_lead',
      'origem', 'observacoes', 'responsavel_id'];

    const updates = [];
    const valores = [];

    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        updates.push(`${campo} = ?`);
        valores.push(req.body[campo]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar' });

    updates.push('atualizado_em = CURRENT_TIMESTAMP');
    valores.push(req.params.id);

    await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...valores);

    const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /clientes/:id
router.delete('/:id', autenticar, async (req, res) => {
  try {
    await db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Cliente removido com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /clientes/:id/anotacoes - Adicionar anotação
router.post('/:id/anotacoes', autenticar, async (req, res) => {
  try {
    const { tipo, titulo, descricao, processo_id, data_atividade } = req.body;

    const result = await db.prepare(`
      INSERT INTO anotacoes (cliente_id, processo_id, usuario_id, tipo, titulo, descricao, data_atividade)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, processo_id, req.usuario.id, tipo || 'nota', titulo, descricao, data_atividade);

    const anotacao = await db.prepare(`
      SELECT a.*, u.nome as usuario_nome
      FROM anotacoes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(anotacao);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
