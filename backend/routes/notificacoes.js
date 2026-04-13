const express = require('express');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');
const webpush = require('web-push');

const router = express.Router();

// Configurar VAPID se as chaves estiverem disponíveis
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@juridico.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /notificacoes - Listar notificações do usuário
router.get('/', autenticar, async (req, res) => {
  try {
    const { lida, limite = 20 } = req.query;

    let where = 'WHERE n.usuario_id = ? OR n.usuario_id IS NULL';
    let params = [req.usuario.id];

    if (lida !== undefined) {
      where += ' AND n.lida = ?';
      params.push(lida === 'true' ? 1 : 0);
    }

    const notificacoes = await db.prepare(`
      SELECT * FROM notificacoes ${where}
      ORDER BY criado_em DESC LIMIT ?
    `).all(...params, parseInt(limite));

    const naoLidas = await db.prepare(`
      SELECT COUNT(*) as total FROM notificacoes
      WHERE (usuario_id = ? OR usuario_id IS NULL) AND lida = 0
    `).get(req.usuario.id);

    res.json({ notificacoes, nao_lidas: naoLidas.total });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /notificacoes/marcar-todas-lidas
router.put('/marcar-todas-lidas', autenticar, async (req, res) => {
  try {
    await db.prepare(`
      UPDATE notificacoes SET lida = 1
      WHERE usuario_id = ? OR usuario_id IS NULL
    `).run(req.usuario.id);
    res.json({ mensagem: 'Todas marcadas como lidas' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /notificacoes/:id/lida
router.put('/:id/lida', autenticar, async (req, res) => {
  try {
    await db.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Marcada como lida' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /notificacoes/push/subscribe - Registrar subscription de push
router.post('/push/subscribe', autenticar, async (req, res) => {
  try {
    const subscription = req.body;

    // Remover assinaturas antigas do usuário
    await db.prepare('DELETE FROM push_subscriptions WHERE usuario_id = ?').run(req.usuario.id);

    // Salvar nova assinatura
    await db.prepare(`
      INSERT INTO push_subscriptions (usuario_id, subscription_json) VALUES (?, ?)
    `).run(req.usuario.id, JSON.stringify(subscription));

    res.json({ mensagem: 'Notificações push ativadas' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /notificacoes/push/vapid-key - Retornar chave pública VAPID
router.get('/push/vapid-key', autenticar, async (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /notificacoes/push/testar - Enviar notificação de teste
router.post('/push/testar', autenticar, async (req, res) => {
  try {
    const subs = await db.prepare('SELECT * FROM push_subscriptions WHERE usuario_id = ?').all(req.usuario.id);

    if (subs.length === 0) {
      return res.status(400).json({ erro: 'Nenhuma assinatura de push encontrada' });
    }

    const payload = JSON.stringify({
      title: '🔔 JurisCRM',
      body: 'Notificações push funcionando!',
      icon: '/favicon.ico'
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(JSON.parse(sub.subscription_json), payload);
      } catch (e) {
        await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }

    res.json({ mensagem: 'Notificação de teste enviada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * Função auxiliar para criar notificação e enviar push
 * Exportada para uso em outros módulos
 */
async function criarNotificacao(usuarioId, tipo, titulo, mensagem, link = null) {
  try {
    await db.prepare(`
      INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(usuarioId, tipo, titulo, mensagem, link);

    // Enviar push se habilitado
    if (process.env.VAPID_PUBLIC_KEY) {
      const query = usuarioId
        ? await db.prepare('SELECT * FROM push_subscriptions WHERE usuario_id = ?').all(usuarioId)
        : await db.prepare('SELECT * FROM push_subscriptions').all();

      const payload = JSON.stringify({ title: titulo, body: mensagem, data: { link } });

      for (const sub of query) {
        try {
          await webpush.sendNotification(JSON.parse(sub.subscription_json), payload);
        } catch (e) {
          if (e.statusCode === 410) {
            await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao criar notificação:', err.message);
  }
}

module.exports = router;
module.exports.criarNotificacao = criarNotificacao;
