const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao configurada. Defina a URL do PostgreSQL no .env.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

let initializing = true;
let ready;

function normalizeSql(sql) {
  let paramIndex = 0;
  return sql
    .replace(/\?/g, () => `$${++paramIndex}`)
    .replace(/datetime\(\$(\d+),\s*'unixepoch'\)/gi, "to_timestamp($$$1)")
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/date\('now',\s*'\+(\d+) days'\)/gi, "CURRENT_DATE + INTERVAL '$1 days'")
    .replace(/date\('now',\s*'-(\d+) days'\)/gi, "CURRENT_DATE - INTERVAL '$1 days'")
    .replace(/date\('now',\s*'-(\d+) months'\)/gi, "CURRENT_DATE - INTERVAL '$1 months'")
    .replace(/datetime\('now',\s*'-(\d+) days'\)/gi, "CURRENT_TIMESTAMP - INTERVAL '$1 days'")
    .replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')")
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
}

function addReturningId(sql) {
  const normalized = sql.trim();
  if (!/^insert\s+into/i.test(normalized) || /\breturning\b/i.test(normalized)) {
    return sql;
  }
  if (/\bon\s+conflict\b/i.test(normalized)) {
    return `${sql} RETURNING id`;
  }
  return `${sql} RETURNING id`;
}

async function runQuery(sql, params = []) {
  if (!initializing && ready) await ready;
  return pool.query(normalizeSql(sql), params);
}

const db = {
  pool,
  async query(sql, params = []) {
    return runQuery(sql, params);
  },
  prepare(sql) {
    return {
      async get(...params) {
        const result = await runQuery(sql, params);
        return result.rows[0];
      },
      async all(...params) {
        const result = await runQuery(sql, params);
        return result.rows;
      },
      async run(...params) {
        let querySql = sql;
        if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(querySql)) {
          querySql = querySql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
          querySql = `${querySql} ON CONFLICT DO NOTHING`;
        }

        const result = await runQuery(addReturningId(querySql), params);
        return {
          changes: result.rowCount,
          rowCount: result.rowCount,
          lastInsertRowid: result.rows[0]?.id
        };
      }
    };
  },
  async close() {
    await pool.end();
  }
};

const schemaSql = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'advogado' CHECK(perfil IN ('admin', 'advogado', 'assistente')),
    ativo INTEGER NOT NULL DEFAULT 1,
    avatar TEXT,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'pf' CHECK(tipo IN ('pf', 'pj')),
    cpf_cnpj TEXT,
    email TEXT,
    telefone TEXT,
    celular TEXT,
    whatsapp TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    area_juridica TEXT,
    status_lead TEXT NOT NULL DEFAULT 'prospecto' CHECK(status_lead IN ('prospecto','qualificado','ativo','encerrado','perdido')),
    origem TEXT,
    observacoes TEXT,
    responsavel_id INTEGER REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS processos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    numero_cnj TEXT NOT NULL,
    tribunal TEXT,
    tribunal_alias TEXT,
    vara TEXT,
    comarca TEXT,
    classe_processual TEXT,
    assunto TEXT,
    polo_ativo TEXT,
    polo_passivo TEXT,
    status TEXT DEFAULT 'em_andamento' CHECK(status IN ('em_andamento','suspenso','arquivado','encerrado')),
    data_distribuicao TEXT,
    valor_causa TEXT,
    observacoes TEXT,
    ultima_movimentacao TEXT,
    ultima_consulta_datajud TIMESTAMPTZ,
    dados_datajud TEXT,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    data_movimentacao TEXT NOT NULL,
    tipo TEXT,
    descricao TEXT NOT NULL,
    complemento TEXT,
    nova INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversas_whatsapp (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    numero_whatsapp TEXT NOT NULL,
    nome_contato TEXT,
    ultimo_contato TIMESTAMPTZ,
    nao_lidas INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES conversas_whatsapp(id) ON DELETE CASCADE,
    message_id TEXT UNIQUE,
    tipo TEXT DEFAULT 'texto' CHECK(tipo IN ('texto','imagem','audio','documento','video')),
    conteudo TEXT NOT NULL,
    remetente TEXT NOT NULL CHECK(remetente IN ('cliente','escritorio')),
    status TEXT DEFAULT 'enviada' CHECK(status IN ('enviada','entregue','lida','erro')),
    arquivo_url TEXT,
    enviado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    lido INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    link TEXT,
    lida INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS anotacoes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    processo_id INTEGER REFERENCES processos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo TEXT DEFAULT 'nota' CHECK(tipo IN ('nota','ligacao','reuniao','email','tarefa')),
    titulo TEXT,
    descricao TEXT NOT NULL,
    data_atividade TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    subscription_json TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prazos (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'prazo' CHECK(tipo IN ('prazo','audiencia','reuniao','diligencia','tarefa')),
    data_vencimento DATE NOT NULL,
    hora TEXT,
    status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente','concluido','cancelado')),
    prioridade TEXT DEFAULT 'normal' CHECK(prioridade IN ('baixa','normal','alta','urgente')),
    criado_por INTEGER REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS instancias_whatsapp (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    evolution_url TEXT NOT NULL,
    evolution_key TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status_lead);
  CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_processos_numero ON processos(numero_cnj);
  CREATE INDEX IF NOT EXISTS idx_processos_tribunal_alias ON processos(tribunal_alias);
  CREATE INDEX IF NOT EXISTS idx_movimentacoes_processo ON movimentacoes(processo_id);
  CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens_whatsapp(conversa_id);
  CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida);
  CREATE INDEX IF NOT EXISTS idx_prazos_vencimento ON prazos(data_vencimento, status);
  CREATE INDEX IF NOT EXISTS idx_prazos_processo ON prazos(processo_id);
`;

async function seedAdmin() {
  const adminExiste = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@juridico.com');
  if (adminExiste || isProduction) return;

  const senha = bcrypt.hashSync('admin123', 10);
  await db.prepare(`
    INSERT INTO usuarios (nome, email, senha, perfil)
    VALUES (?, ?, ?, 'admin')
  `).run('Administrador', 'admin@juridico.com', senha);
  console.log('Usuario admin de desenvolvimento criado: admin@juridico.com / admin123');
}

async function init() {
  await pool.query(schemaSql);
  await pool.query('ALTER TABLE processos ADD COLUMN IF NOT EXISTS tribunal_alias TEXT');
  await seedAdmin();
}

ready = init().finally(() => {
  initializing = false;
}).catch((err) => {
  console.error('Erro ao inicializar PostgreSQL:', err.message);
  throw err;
});

db.ready = ready;

module.exports = db;
