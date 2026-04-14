const express = require('express');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');
const evolution = require('../services/evolutionApi');

const router = express.Router();

// GET /whatsapp/status - Status da conexão (checa instâncias do banco primeiro)
router.get('/status', autenticar, async (req, res) => {
  try {
    // Verificar instâncias configuradas no banco
    const instancias = await db.prepare('SELECT * FROM instancias_whatsapp WHERE ativo = true').all();
    if (instancias.length > 0) {
      for (const inst of instancias) {
        const status = await evolution.verificarConexao(inst);
        if (status.conectado) {
          return res.json({ ...status, instancia_nome: inst.nome, instancia_id: inst.id });
        }
      }
      return res.json({ conectado: false, estado: 'disconnected' });
    }
    // Fallback para variáveis de ambiente
    const status = await evolution.verificarConexao();
    res.json(status);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /whatsapp/qrcode - Obter QR Code
router.get('/qrcode', autenticar, async (req, res) => {
  try {
    const qr = await evolution.obterQRCode();
    res.json(qr);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/conectar - Criar/reconectar instância
router.post('/conectar', autenticar, async (req, res) => {
  try {
    const resultado = await evolution.criarInstancia();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/desconectar
router.post('/desconectar', autenticar, async (req, res) => {
  try {
    await evolution.desconectar();
    res.json({ mensagem: 'Desconectado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /whatsapp/conversas - Listar conversas do banco local
router.get('/conversas', autenticar, async (req, res) => {
  try {
    const conversas = await db.prepare(`
      SELECT cw.*,
             c.nome as cliente_nome,
             c.id as cliente_id,
             (SELECT conteudo FROM mensagens_whatsapp WHERE conversa_id = cw.id ORDER BY enviado_em DESC LIMIT 1) as ultima_mensagem,
             (SELECT enviado_em FROM mensagens_whatsapp WHERE conversa_id = cw.id ORDER BY enviado_em DESC LIMIT 1) as ultima_mensagem_em
      FROM conversas_whatsapp cw
      LEFT JOIN clientes c ON cw.cliente_id = c.id
      ORDER BY COALESCE(ultima_mensagem_em, cw.criado_em) DESC
    `).all();

    res.json(conversas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /whatsapp/conversas/:id/mensagens - Mensagens de uma conversa
router.get('/conversas/:id/mensagens', autenticar, async (req, res) => {
  try {
    const { limite = 50, antes } = req.query;

    let where = 'WHERE conversa_id = ?';
    let params = [req.params.id];

    if (antes) {
      where += ' AND enviado_em < ?';
      params.push(antes);
    }

    const mensagens = await db.prepare(`
      SELECT * FROM mensagens_whatsapp ${where}
      ORDER BY enviado_em DESC LIMIT ?
    `).all(...params, parseInt(limite));

    // Marcar como lidas
    await db.prepare('UPDATE conversas_whatsapp SET nao_lidas = 0 WHERE id = ?').run(req.params.id);
    await db.prepare('UPDATE mensagens_whatsapp SET lido = 1 WHERE conversa_id = ? AND remetente = ?').run(req.params.id, 'cliente');

    res.json(mensagens.reverse());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/conversas/:id/mensagens - Enviar mensagem
router.post('/conversas/:id/mensagens', autenticar, async (req, res) => {
  try {
    const { conteudo, tipo = 'texto' } = req.body;

    const conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE id = ?').get(req.params.id);
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada' });

    // Enviar via Evolution API
    let messageId = null;
    try {
      const resultado = await evolution.enviarMensagem(conversa.numero_whatsapp, conteudo);
      messageId = resultado.messageId;
    } catch (err) {
      console.error('Erro ao enviar via Evolution API:', err.message);
    }

    // Salvar no banco local
    const result = await db.prepare(`
      INSERT INTO mensagens_whatsapp (conversa_id, message_id, tipo, conteudo, remetente, status, lido)
      VALUES (?, ?, ?, ?, 'escritorio', 'enviada', 1)
    `).run(req.params.id, messageId, tipo, conteudo);

    // Atualizar último contato da conversa
    await db.prepare('UPDATE conversas_whatsapp SET ultimo_contato = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

    const mensagem = await db.prepare('SELECT * FROM mensagens_whatsapp WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(mensagem);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/nova-conversa - Iniciar nova conversa
router.post('/nova-conversa', autenticar, async (req, res) => {
  try {
    const { numero, cliente_id, mensagem_inicial } = req.body;
    if (!numero) return res.status(400).json({ erro: 'Número é obrigatório' });

    // Verificar se já existe conversa com esse número
    let conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE numero_whatsapp = ?').get(numero);

    if (!conversa) {
      const result = await db.prepare(`
        INSERT INTO conversas_whatsapp (numero_whatsapp, cliente_id, ultimo_contato)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(numero, cliente_id || null);
      conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE id = ?').get(result.lastInsertRowid);
    } else if (cliente_id) {
      await db.prepare('UPDATE conversas_whatsapp SET cliente_id = ? WHERE id = ?').run(cliente_id, conversa.id);
    }

    // Enviar mensagem inicial se fornecida
    if (mensagem_inicial) {
      await evolution.enviarMensagem(numero, mensagem_inicial);
      await db.prepare(`
        INSERT INTO mensagens_whatsapp (conversa_id, tipo, conteudo, remetente, status, lido)
        VALUES (?, 'texto', ?, 'escritorio', 'enviada', 1)
      `).run(conversa.id, mensagem_inicial);
    }

    res.status(201).json(conversa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /whatsapp/conversas/:id/vincular - Vincular conversa a cliente
router.put('/conversas/:id/vincular', autenticar, async (req, res) => {
  try {
    const { cliente_id } = req.body;
    await db.prepare('UPDATE conversas_whatsapp SET cliente_id = ? WHERE id = ?').run(cliente_id, req.params.id);
    res.json({ mensagem: 'Conversa vinculada ao cliente' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// CRUD DE INSTÂNCIAS
// ============================================================

// GET /whatsapp/instancias - Listar instâncias configuradas
router.get('/instancias', autenticar, async (req, res) => {
  try {
    const instancias = await db.prepare('SELECT * FROM instancias_whatsapp ORDER BY criado_em ASC').all();
    res.json(instancias);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/instancias - Criar nova instância
router.post('/instancias', autenticar, async (req, res) => {
  try {
    const { nome, evolution_url, evolution_key, instance_name } = req.body;
    if (!nome || !evolution_url || !evolution_key || !instance_name) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }
    const result = await db.prepare(`
      INSERT INTO instancias_whatsapp (nome, evolution_url, evolution_key, instance_name)
      VALUES (?, ?, ?, ?)
    `).run(nome, evolution_url, evolution_key, instance_name);
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(instancia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /whatsapp/instancias/:id - Atualizar instância
router.put('/instancias/:id', autenticar, async (req, res) => {
  try {
    const { nome, evolution_url, evolution_key, instance_name, ativo } = req.body;
    await db.prepare(`
      UPDATE instancias_whatsapp
      SET nome = ?, evolution_url = ?, evolution_key = ?, instance_name = ?, ativo = ?
      WHERE id = ?
    `).run(nome, evolution_url, evolution_key, instance_name, ativo !== false, req.params.id);
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(req.params.id);
    res.json(instancia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /whatsapp/instancias/:id - Remover instância
router.delete('/instancias/:id', autenticar, async (req, res) => {
  try {
    await db.prepare('DELETE FROM instancias_whatsapp WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Instância removida' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /whatsapp/instancias/:id/status - Status de uma instância específica
router.get('/instancias/:id/status', autenticar, async (req, res) => {
  try {
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(req.params.id);
    if (!instancia) return res.status(404).json({ erro: 'Instância não encontrada' });
    const status = await evolution.verificarConexao(instancia);
    res.json(status);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /whatsapp/instancias/:id/qrcode - QR Code de uma instância
router.get('/instancias/:id/qrcode', autenticar, async (req, res) => {
  try {
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(req.params.id);
    if (!instancia) return res.status(404).json({ erro: 'Instância não encontrada' });
    const qr = await evolution.obterQRCode(instancia);
    res.json(qr);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/instancias/:id/conectar - Conectar instância
router.post('/instancias/:id/conectar', autenticar, async (req, res) => {
  try {
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(req.params.id);
    if (!instancia) return res.status(404).json({ erro: 'Instância não encontrada' });
    await evolution.criarInstancia(instancia);
    const qr = await evolution.obterQRCode(instancia);
    res.json(qr);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/instancias/:id/desconectar - Desconectar instância
router.post('/instancias/:id/desconectar', autenticar, async (req, res) => {
  try {
    const instancia = await db.prepare('SELECT * FROM instancias_whatsapp WHERE id = ?').get(req.params.id);
    if (!instancia) return res.status(404).json({ erro: 'Instância não encontrada' });
    await evolution.desconectar(instancia);
    res.json({ mensagem: 'Instância desconectada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /whatsapp/webhook - Receber eventos da Evolution API
router.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Webhook recebido:', req.body?.event, JSON.stringify(req.body?.data)?.substring(0, 200));
    const eventos = evolution.processarWebhook(req.body);
    const io = req.app.get('io');

    for (const evento of eventos) {
      if (evento.tipo === 'mensagem' && !evento.fromMe) {
        // Buscar ou criar conversa
        let conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE numero_whatsapp = ?').get(evento.numero);

        if (!conversa) {
          // Tentar vincular a cliente existente pelo número
          const cliente = await db.prepare(`
            SELECT id, nome FROM clientes
            WHERE REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', '') LIKE ?
               OR REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', '') LIKE ?
          `).get(`%${evento.numero.slice(-8)}%`, `%${evento.numero.slice(-8)}%`);

          const res2 = await db.prepare(`
            INSERT INTO conversas_whatsapp (numero_whatsapp, cliente_id, nome_contato, ultimo_contato, nao_lidas)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
          `).run(evento.numero, cliente?.id || null, cliente?.nome || evento.numero);

          conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE id = ?').get(res2.lastInsertRowid);
        } else {
          // Incrementar não lidas
          await db.prepare('UPDATE conversas_whatsapp SET nao_lidas = nao_lidas + 1, ultimo_contato = CURRENT_TIMESTAMP WHERE id = ?').run(conversa.id);
        }

        // Salvar mensagem
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO mensagens_whatsapp (conversa_id, message_id, tipo, conteudo, remetente, enviado_em)
            VALUES (?, ?, ?, ?, 'cliente', datetime(?, 'unixepoch'))
          `).run(conversa.id, evento.messageId, evento.tipoMensagem, evento.conteudo, evento.timestamp);
        } catch (e) { /* ignore duplicata */ }

        // Emitir via Socket.io para frontend em tempo real
        if (io) {
          io.emit('nova_mensagem_whatsapp', {
            conversa_id: conversa.id,
            numero: evento.numero,
            conteudo: evento.conteudo,
            tipo: evento.tipoMensagem
          });
        }
      }

      if (evento.tipo === 'conexao' && io) {
        io.emit('whatsapp_status', { estado: evento.estado, qrcode: evento.qrcode });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
