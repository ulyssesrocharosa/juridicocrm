require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// Banco de dados (inicializa o schema)
const db = require('./db/database');

// Rotas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const processosRoutes = require('./routes/processos');
const whatsappRoutes = require('./routes/whatsapp');
const notificacoesRoutes = require('./routes/notificacoes');
const { criarNotificacao } = require('./routes/notificacoes');
const prazosRoutes = require('./routes/prazos');
const relatoriosRoutes = require('./routes/relatorios');

// Serviços
const datajud = require('./services/datajud');
const evolution = require('./services/evolutionApi');

// ============================================================
// CONFIGURAÇÃO DO SERVIDOR
// ============================================================

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Disponibilizar io globalmente via app
app.set('io', io);

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// ROTAS
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/processos', processosRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/prazos', prazosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
    servico: 'JurisCRM API'
  });
});

// Dashboard Stats
app.get('/api/dashboard', require('./middleware/auth').autenticar, async (req, res) => {
  try {
    const clientes = await db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status_lead = 'ativo' THEN 1 ELSE 0 END), 0) as ativos, COALESCE(SUM(CASE WHEN status_lead = 'prospecto' THEN 1 ELSE 0 END), 0) as prospectos FROM clientes").get();
    const processos = await db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END), 0) as em_andamento FROM processos").get();
    const movNovas = await db.prepare('SELECT COUNT(*) as total FROM movimentacoes WHERE nova = 1').get();
    const naoLidas = await db.prepare('SELECT SUM(nao_lidas) as total FROM conversas_whatsapp').get();
    const notNaoLidas = await db.prepare('SELECT COUNT(*) as total FROM notificacoes WHERE (usuario_id = ? OR usuario_id IS NULL) AND lida = 0').get(req.usuario.id);
    const prazosProximos = await db.prepare(`
      SELECT pz.*, c.nome as cliente_nome, p.numero_cnj as processo_cnj
      FROM prazos pz
      LEFT JOIN clientes c ON pz.cliente_id = c.id
      LEFT JOIN processos p ON pz.processo_id = p.id
      WHERE pz.status = 'pendente' AND pz.data_vencimento >= date('now') AND pz.data_vencimento <= date('now', '+7 days')
      ORDER BY pz.data_vencimento ASC LIMIT 5
    `).all();
    const processosSemConsulta = await db.prepare(`
      SELECT COUNT(*) as total FROM processos WHERE status = 'em_andamento' AND (ultima_consulta_datajud IS NULL OR ultima_consulta_datajud < datetime('now', '-30 days'))
    `).get();

    const clientesRecentes = await db.prepare('SELECT id, nome, status_lead, area_juridica, criado_em FROM clientes ORDER BY criado_em DESC LIMIT 5').all();
    const processosComMovs = await db.prepare(`
      SELECT p.id, p.numero_cnj, p.classe_processual, c.nome as cliente_nome,
             COUNT(m.id) as novas_movimentacoes
      FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN movimentacoes m ON m.processo_id = p.id AND m.nova = 1
      WHERE m.id IS NOT NULL
      GROUP BY p.id, c.nome
      ORDER BY p.atualizado_em DESC
      LIMIT 5
    `).all();

    const leadsPorStatus = await db.prepare(`
      SELECT status_lead as status, COUNT(*) as total FROM clientes GROUP BY status_lead
    `).all();

    const leadsPorMes = await db.prepare(`
      SELECT strftime('%Y-%m', criado_em) as mes, COUNT(*) as total
      FROM clientes
      WHERE criado_em >= date('now', '-6 months')
      GROUP BY mes ORDER BY mes
    `).all();

    res.json({
      resumo: {
        total_clientes: clientes.total,
        clientes_ativos: clientes.ativos,
        prospectos: clientes.prospectos,
        total_processos: processos.total,
        processos_andamento: processos.em_andamento,
        novas_movimentacoes: movNovas.total,
        mensagens_nao_lidas: naoLidas.total || 0,
        notificacoes_nao_lidas: notNaoLidas.total
      },
      clientes_recentes: clientesRecentes,
      processos_com_novidades: processosComMovs,
      leads_por_status: leadsPorStatus,
      leads_por_mes: leadsPorMes,
      prazos_proximos: prazosProximos,
      processos_sem_consulta: processosSemConsulta.total || 0
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// SOCKET.IO - Tempo Real
// ============================================================

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('autenticar', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuarioId = decoded.id;
      socket.join(`user_${decoded.id}`);
      socket.emit('autenticado', { id: decoded.id, nome: decoded.nome });
    } catch (err) {
      socket.emit('erro_auth', 'Token inválido');
    }
  });

  socket.on('entrar_conversa', (conversaId) => {
    socket.join(`conversa_${conversaId}`);
  });

  socket.on('sair_conversa', (conversaId) => {
    socket.leave(`conversa_${conversaId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
// JOBS AGENDADOS - Polling DataJud
// ============================================================

// A cada 6 horas: verificar movimentações de todos os processos ativos
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Iniciando verificação de movimentações DataJud...');

  const processos = await db.prepare(`
    SELECT * FROM processos WHERE status = 'em_andamento'
  `).all();

  let total = 0, novas = 0;

  for (const processo of processos) {
    try {
      const resultado = await datajud.buscarProcesso(processo.numero_cnj, processo.tribunal_alias);

      if (!resultado.encontrado) continue;

      // Atualizar dados
      await db.prepare(`
        UPDATE processos SET
          dados_datajud = ?,
          ultima_consulta_datajud = CURRENT_TIMESTAMP,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(resultado.dados), processo.id);

      // Verificar e salvar novas movimentações
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

          novas++;

          // Criar notificação para todos os usuários
          const cliente = await db.prepare('SELECT nome FROM clientes WHERE id = ?').get(processo.cliente_id);
          await criarNotificacao(
            null, // null = todos os usuários
            'movimentacao_processo',
            `📋 Nova movimentação: ${processo.numero_cnj}`,
            `${cliente?.nome || 'Cliente'}: ${mov.nome}`,
            `/processos/${processo.id}`
          );

          // Emitir via Socket.io
          io.emit('nova_movimentacao', {
            processo_id: processo.id,
            numero_cnj: processo.numero_cnj,
            cliente_id: processo.cliente_id,
            movimentacao: mov
          });
        }
      }

      if (resultado.movimentacoes.length > 0) {
        await db.prepare('UPDATE processos SET ultima_movimentacao = ? WHERE id = ?')
          .run(resultado.movimentacoes[0].nome, processo.id);
      }

      total++;

      // Aguardar 1s entre requisições para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Erro ao verificar processo ${processo.numero_cnj}:`, err.message);
    }
  }

  console.log(`✅ DataJud: ${total} processos verificados, ${novas} novas movimentações`);
});

// Todos os dias às 8h: alertar sobre prazos próximos
cron.schedule('0 8 * * *', async () => {
  console.log('📅 Verificando prazos próximos...');
  const diasAlertar = [1, 3, 7];

  for (const dias of diasAlertar) {
    const prazos = await db.prepare(`
      SELECT pz.*, c.nome as cliente_nome, p.numero_cnj
      FROM prazos pz
      LEFT JOIN clientes c ON pz.cliente_id = c.id
      LEFT JOIN processos p ON pz.processo_id = p.id
      WHERE pz.status = 'pendente'
        AND pz.data_vencimento = date('now', '+${dias} days')
    `).all();

    for (const prazo of prazos) {
      const labelDias = dias === 1 ? 'amanhã' : `em ${dias} dias`;
      await criarNotificacao(
        null,
        'prazo_vencimento',
        `⏰ Prazo vence ${labelDias}: ${prazo.titulo}`,
        prazo.cliente_nome ? `Cliente: ${prazo.cliente_nome}` : prazo.numero_cnj || '',
        `/agenda`
      );
    }
  }
});

// Configurar webhook da Evolution API ao iniciar
(async () => {
  try {
    const PORT = process.env.PORT || 3001;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    if (baseUrl.startsWith('http://localhost')) {
      console.log('⚠️  BASE_URL não configurada — webhook desativado. Usando polling a cada minuto.');
    } else {
      await evolution.configurarWebhook(`${baseUrl}/api/whatsapp/webhook`);
      console.log('✅ Webhook Evolution API configurado em:', `${baseUrl}/api/whatsapp/webhook`);
    }
  } catch (err) {
    console.log('⚠️ Erro ao configurar webhook:', err.message);
  }
})();

// ============================================================
// POLLING WhatsApp — fallback quando webhook não está disponível
// Roda a cada 1 minuto e importa mensagens recebidas
// ============================================================

let ultimoPollingTs = Math.floor(Date.now() / 1000) - 120; // começa 2 min atrás

cron.schedule('* * * * *', async () => {
  try {
    const novas = await evolution.sincronizarMensagensRecentes(ultimoPollingTs);
    const agora = Math.floor(Date.now() / 1000);

    for (const evento of novas) {
      if (!evento.numero) continue;

      let conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE numero_whatsapp = ?').get(evento.numero);

      if (!conversa) {
        const cliente = await db.prepare(`
          SELECT id, nome FROM clientes
          WHERE REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', '') LIKE ?
             OR REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', '') LIKE ?
        `).get(`%${evento.numero.slice(-8)}%`, `%${evento.numero.slice(-8)}%`);

        const r = await db.prepare(`
          INSERT INTO conversas_whatsapp (numero_whatsapp, cliente_id, nome_contato, ultimo_contato, nao_lidas)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
        `).run(evento.numero, cliente?.id || null, cliente?.nome || evento.numero);

        conversa = await db.prepare('SELECT * FROM conversas_whatsapp WHERE id = ?').get(r.lastInsertRowid);
      }

      const existe = evento.messageId
        ? await db.prepare('SELECT id FROM mensagens_whatsapp WHERE message_id = ?').get(evento.messageId)
        : null;

      if (!existe) {
        await db.prepare(`
          INSERT OR IGNORE INTO mensagens_whatsapp (conversa_id, message_id, tipo, conteudo, remetente, enviado_em)
          VALUES (?, ?, ?, ?, 'cliente', datetime(?, 'unixepoch'))
        `).run(conversa.id, evento.messageId || null, evento.tipoMensagem, evento.conteudo, evento.timestamp);

        await db.prepare('UPDATE conversas_whatsapp SET nao_lidas = nao_lidas + 1, ultimo_contato = CURRENT_TIMESTAMP WHERE id = ?').run(conversa.id);

        io.emit('nova_mensagem_whatsapp', {
          conversa_id: conversa.id,
          numero: evento.numero,
          conteudo: evento.conteudo,
          tipo: evento.tipoMensagem
        });
      }
    }

    if (novas.length > 0) {
      console.log(`📲 Polling WhatsApp: ${novas.length} mensagem(ns) importada(s)`);
    }

    ultimoPollingTs = agora;
  } catch (err) {
    console.error('Erro no polling WhatsApp:', err.message);
  }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT = process.env.PORT || 3001;
db.ready.then(() => {
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║      🏛️  JurisCRM API - v1.0.0         ║
  ╠════════════════════════════════════════╣
  ║  Servidor: http://localhost:${PORT}       ║
  ║  Health:   /api/health                 ║
  ║  DataJud:  Polling a cada 6 horas      ║
  ╚════════════════════════════════════════╝
  `);
});
}).catch((err) => {
  console.error('Falha ao inicializar banco de dados:', err.message);
  process.exit(1);
});

module.exports = { app, server, io };
