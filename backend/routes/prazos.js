const express = require('express');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// GET /prazos - Listar com filtros
router.get('/', autenticar, async (req, res) => {
  try {
    const { status, tipo, processo_id, cliente_id, pagina = 1, limite = 50 } = req.query;
    const offset = (pagina - 1) * limite;

    let where = [];
    let params = [];

    if (status) { where.push('pz.status = ?'); params.push(status); }
    if (tipo) { where.push('pz.tipo = ?'); params.push(tipo); }
    if (processo_id) { where.push('pz.processo_id = ?'); params.push(processo_id); }
    if (cliente_id) { where.push('pz.cliente_id = ?'); params.push(cliente_id); }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const prazos = await db.prepare(`
      SELECT pz.*,
             p.numero_cnj as processo_cnj,
             c.nome as cliente_nome,
             u.nome as criado_por_nome
      FROM prazos pz
      LEFT JOIN processos p ON pz.processo_id = p.id
      LEFT JOIN clientes c ON pz.cliente_id = c.id
      LEFT JOIN usuarios u ON pz.criado_por = u.id
      ${whereStr}
      ORDER BY pz.data_vencimento ASC, pz.hora ASC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limite), parseInt(offset));

    const total = await db.prepare(`
      SELECT COUNT(*) as total FROM prazos pz ${whereStr}
    `).get(...params);

    res.json({ dados: prazos, total: total.total });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /prazos/proximos - Prazos dos próximos 30 dias (pendentes)
router.get('/proximos', autenticar, async (req, res) => {
  try {
    const prazos = await db.prepare(`
      SELECT pz.*,
             p.numero_cnj as processo_cnj,
             c.nome as cliente_nome
      FROM prazos pz
      LEFT JOIN processos p ON pz.processo_id = p.id
      LEFT JOIN clientes c ON pz.cliente_id = c.id
      WHERE pz.status = 'pendente'
        AND pz.data_vencimento >= date('now')
        AND pz.data_vencimento <= date('now', '+30 days')
      ORDER BY pz.data_vencimento ASC, pz.hora ASC
      LIMIT 20
    `).all();

    res.json(prazos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /prazos/:id
router.get('/:id', autenticar, async (req, res) => {
  try {
    const prazo = await db.prepare(`
      SELECT pz.*, p.numero_cnj as processo_cnj, c.nome as cliente_nome
      FROM prazos pz
      LEFT JOIN processos p ON pz.processo_id = p.id
      LEFT JOIN clientes c ON pz.cliente_id = c.id
      WHERE pz.id = ?
    `).get(req.params.id);
    if (!prazo) return res.status(404).json({ erro: 'Prazo não encontrado' });
    res.json(prazo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /prazos - Criar
router.post('/', autenticar, async (req, res) => {
  try {
    const { processo_id, cliente_id, titulo, descricao, tipo, data_vencimento, hora, prioridade } = req.body;

    if (!titulo || !data_vencimento) {
      return res.status(400).json({ erro: 'Título e data de vencimento são obrigatórios' });
    }

    const result = await db.prepare(`
      INSERT INTO prazos (processo_id, cliente_id, titulo, descricao, tipo, data_vencimento, hora, prioridade, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      processo_id || null, cliente_id || null, titulo, descricao || null,
      tipo || 'prazo', data_vencimento, hora || null,
      prioridade || 'normal', req.usuario.id
    );

    const prazo = await db.prepare('SELECT * FROM prazos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(prazo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /prazos/:id - Atualizar
router.put('/:id', autenticar, async (req, res) => {
  try {
    const campos = ['titulo', 'descricao', 'tipo', 'data_vencimento', 'hora', 'status', 'prioridade', 'processo_id', 'cliente_id'];
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

    await db.prepare(`UPDATE prazos SET ${updates.join(', ')} WHERE id = ?`).run(...valores);

    const prazo = await db.prepare('SELECT * FROM prazos WHERE id = ?').get(req.params.id);
    res.json(prazo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /prazos/:id/concluir - Marcar como concluído
router.put('/:id/concluir', autenticar, async (req, res) => {
  try {
    await db.prepare(`UPDATE prazos SET status = 'concluido', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(req.params.id);
    res.json({ mensagem: 'Prazo concluído' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /prazos/:id
router.delete('/:id', autenticar, async (req, res) => {
  try {
    await db.prepare('DELETE FROM prazos WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Prazo removido' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
