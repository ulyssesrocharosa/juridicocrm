const express = require('express');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');
const datajud = require('../services/datajud');

const router = express.Router();

// GET /processos - Listar
router.get('/', autenticar, async (req, res) => {
  try {
    const { cliente_id, status, tribunal, busca, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;

    let where = [];
    let params = [];

    if (cliente_id) { where.push('p.cliente_id = ?'); params.push(cliente_id); }
    if (status) { where.push('p.status = ?'); params.push(status); }
    if (tribunal) { where.push('p.tribunal LIKE ?'); params.push(`%${tribunal}%`); }
    if (busca) {
      where.push('(p.numero_cnj LIKE ? OR p.classe_processual LIKE ? OR c.nome LIKE ?)');
      const b = `%${busca}%`;
      params.push(b, b, b);
    }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const processos = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.email as cliente_email
      FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      ${whereStr}
      ORDER BY p.atualizado_em DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limite), parseInt(offset));

    const total = await db.prepare(`
      SELECT COUNT(*) as total FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id ${whereStr}
    `).get(...params);

    res.json({ dados: processos, total: total.total });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /processos/tribunais - Lista de tribunais para seleção no frontend
router.get('/tribunais', autenticar, async (req, res) => {
  res.json(datajud.LISTA_TRIBUNAIS);
});

// GET /processos/stats
router.get('/stats', autenticar, async (req, res) => {
  try {
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) as em_andamento,
        SUM(CASE WHEN status = 'suspenso' THEN 1 ELSE 0 END) as suspensos,
        SUM(CASE WHEN status = 'encerrado' THEN 1 ELSE 0 END) as encerrados,
        SUM(CASE WHEN ultima_consulta_datajud IS NULL THEN 1 ELSE 0 END) as sem_consulta
      FROM processos
    `).get();

    res.json(stats);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /processos/:id - Detalhe
router.get('/:id', autenticar, async (req, res) => {
  try {
    const processo = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
      FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!processo) return res.status(404).json({ erro: 'Processo não encontrado' });

    const movimentacoes = await db.prepare(`
      SELECT * FROM movimentacoes WHERE processo_id = ? ORDER BY data_movimentacao DESC
    `).all(req.params.id);

    res.json({ ...processo, movimentacoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /processos - Criar
router.post('/', autenticar, async (req, res) => {
  try {
    const {
      cliente_id, numero_cnj, tribunal, tribunal_alias, vara, comarca, classe_processual,
      assunto, polo_ativo, polo_passivo, status, data_distribuicao,
      valor_causa, observacoes
    } = req.body;

    if (!cliente_id || !numero_cnj) {
      return res.status(400).json({ erro: 'Cliente e número CNJ são obrigatórios' });
    }

    const result = await db.prepare(`
      INSERT INTO processos (
        cliente_id, numero_cnj, tribunal, tribunal_alias, vara, comarca, classe_processual,
        assunto, polo_ativo, polo_passivo, status, data_distribuicao,
        valor_causa, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cliente_id, numero_cnj, tribunal, tribunal_alias, vara, comarca, classe_processual,
      assunto, polo_ativo, polo_passivo, status || 'em_andamento',
      data_distribuicao, valor_causa, observacoes
    );

    // Atualizar data do cliente
    await db.prepare('UPDATE clientes SET atualizado_em = CURRENT_TIMESTAMP WHERE id = ?').run(cliente_id);

    const processo = await db.prepare('SELECT * FROM processos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(processo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /processos/:id
router.put('/:id', autenticar, async (req, res) => {
  try {
    const campos = ['numero_cnj', 'tribunal', 'tribunal_alias', 'vara', 'comarca', 'classe_processual',
      'assunto', 'polo_ativo', 'polo_passivo', 'status', 'data_distribuicao',
      'valor_causa', 'observacoes'];

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

    await db.prepare(`UPDATE processos SET ${updates.join(', ')} WHERE id = ?`).run(...valores);

    const processo = await db.prepare('SELECT * FROM processos WHERE id = ?').get(req.params.id);
    res.json(processo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /processos/:id
router.delete('/:id', autenticar, async (req, res) => {
  try {
    await db.prepare('DELETE FROM processos WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Processo removido' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /processos/:id/consultar-datajud - Consultar DataJud manualmente
router.post('/:id/consultar-datajud', autenticar, async (req, res) => {
  try {
    const processo = await db.prepare('SELECT * FROM processos WHERE id = ?').get(req.params.id);
    if (!processo) return res.status(404).json({ erro: 'Processo não encontrado' });

    const resultado = await datajud.buscarProcesso(processo.numero_cnj, processo.tribunal_alias);

    if (!resultado.encontrado) {
      return res.json({ mensagem: 'Processo não encontrado no DataJud', encontrado: false });
    }

    // Salvar dados no banco
    await db.prepare(`
      UPDATE processos SET
        dados_datajud = ?,
        ultima_consulta_datajud = CURRENT_TIMESTAMP,
        classe_processual = COALESCE(classe_processual, ?),
        assunto = COALESCE(assunto, ?),
        tribunal = COALESCE(tribunal, ?),
        tribunal_alias = COALESCE(tribunal_alias, ?),
        vara = COALESCE(vara, ?),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(resultado.dados),
      resultado.dados.classe,
      resultado.dados.assunto,
      resultado.dados.tribunal,
      resultado.tribunalAlias || processo.tribunal_alias,
      resultado.dados.orgaoJulgador,
      processo.id
    );

    // Salvar movimentações novas
    let novasMovs = 0;
    for (const mov of resultado.movimentacoes) {
      const existe = await db.prepare(`
        SELECT id FROM movimentacoes
        WHERE processo_id = ? AND data_movimentacao = ? AND descricao = ?
      `).get(processo.id, mov.data, mov.nome);

      if (!existe) {
        await db.prepare(`
          INSERT INTO movimentacoes (processo_id, data_movimentacao, tipo, descricao, complemento, nova)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(processo.id, mov.data, mov.codigo?.toString(), mov.nome, mov.complemento);
        novasMovs++;
      }
    }

    // Atualizar última movimentação
    if (resultado.movimentacoes.length > 0) {
      await db.prepare('UPDATE processos SET ultima_movimentacao = ? WHERE id = ?')
        .run(resultado.movimentacoes[0].nome, processo.id);
    }

    res.json({
      encontrado: true,
      dados: resultado.dados,
      movimentacoes: resultado.movimentacoes,
      novasMovimentacoes: novasMovs
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /processos/:id/movimentacoes
router.get('/:id/movimentacoes', autenticar, async (req, res) => {
  try {
    const movimentacoes = await db.prepare(`
      SELECT * FROM movimentacoes
      WHERE processo_id = ?
      ORDER BY data_movimentacao DESC
    `).all(req.params.id);

    // Marcar como lidas
    await db.prepare('UPDATE movimentacoes SET nova = 0 WHERE processo_id = ?').run(req.params.id);

    res.json(movimentacoes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /processos/buscar-cnj - Busca rápida pelo número CNJ
router.post('/buscar-cnj', autenticar, async (req, res) => {
  try {
    const { numero_cnj, tribunal_alias } = req.body;
    if (!numero_cnj) return res.status(400).json({ erro: 'Número CNJ obrigatório' });

    const resultado = await datajud.buscarProcesso(numero_cnj, tribunal_alias);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /processos/importar-por-cpf - Busca processos no DataJud pelo CPF/CNPJ e importa
router.post('/importar-por-cpf', autenticar, async (req, res) => {
  try {
    const { documento, cliente_id, tribunal_alias } = req.body;
    if (!documento) return res.status(400).json({ erro: 'CPF/CNPJ é obrigatório' });
    if (!cliente_id) return res.status(400).json({ erro: 'cliente_id é obrigatório' });

    const resultado = await datajud.buscarPorDocumento(documento, tribunal_alias);

    // A API pública do DataJud não suporta busca por CPF
    if (resultado.suportado === false) {
      return res.json({
        importados: 0,
        suportado: false,
        mensagem: resultado.motivo
      });
    }

    const encontrados = resultado.resultados || [];

    if (encontrados.length === 0) {
      return res.json({ importados: 0, mensagem: 'Nenhum processo encontrado no DataJud para este documento.' });
    }

    let importados = 0;
    const processosSalvos = [];

    for (const p of encontrados) {
      const existe = await db.prepare('SELECT id FROM processos WHERE numero_cnj = ? AND cliente_id = ?')
        .get(p.numero_cnj, cliente_id);
      if (existe) continue;

      const result = await db.prepare(`
        INSERT INTO processos (
          cliente_id, numero_cnj, tribunal, tribunal_alias, vara, classe_processual,
          assunto, status, data_distribuicao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'em_andamento', ?)
      `).run(
        cliente_id, p.numero_cnj, p.tribunal, p.tribunalAlias || tribunal_alias || null, p.orgaoJulgador,
        p.classe, p.assunto, p.dataDistribuicao || null
      );

      processosSalvos.push(await db.prepare('SELECT * FROM processos WHERE id = ?').get(result.lastInsertRowid));
      importados++;
    }

    await db.prepare('UPDATE clientes SET atualizado_em = CURRENT_TIMESTAMP WHERE id = ?').run(cliente_id);

    res.json({
      importados,
      total_encontrados: encontrados.length,
      processos: processosSalvos,
      mensagem: `${importados} processo(s) importado(s) com sucesso.`
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
