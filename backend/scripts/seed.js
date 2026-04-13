/**
 * Script de seed para popular o banco com dados fictícios.
 * Uso: node scripts/seed.js
 */

const db = require('../db/database');

async function main() {
await db.ready;


// Buscar o id do admin
const admin = await db.prepare("SELECT id FROM usuarios LIMIT 1").get();
if (!admin) {
  console.error('❌ Nenhum usuário encontrado. Inicie o servidor para criar o admin padrão.');
  process.exit(1);
}
const adminId = admin.id;

console.log('🌱 Iniciando seed de dados fictícios...\n');

// ============================================================
// CLIENTES
// ============================================================

const clientes = [
  {
    nome: 'Maria Aparecida Santos',
    tipo: 'pf',
    cpf_cnpj: '123.456.789-01',
    email: 'maria.santos@email.com',
    telefone: '(11) 3456-7890',
    celular: '(11) 91234-5678',
    cidade: 'São Paulo',
    estado: 'SP',
    area_juridica: 'Trabalhista',
    status_lead: 'prospecto',
    origem: 'Indicação',
    observacoes: 'Demitida sem justa causa após 8 anos de empresa. Quer reclamatória trabalhista.',
  },
  {
    nome: 'João Carlos Oliveira',
    tipo: 'pf',
    cpf_cnpj: '234.567.890-12',
    email: 'joao.oliveira@email.com',
    telefone: '(21) 2345-6789',
    celular: '(21) 92345-6789',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    area_juridica: 'Cível',
    status_lead: 'qualificado',
    origem: 'Site',
    observacoes: 'Acidente de trânsito com danos materiais e morais. Já tem boletim de ocorrência.',
  },
  {
    nome: 'Ana Paula Costa',
    tipo: 'pf',
    cpf_cnpj: '345.678.901-23',
    email: 'ana.costa@email.com',
    celular: '(11) 93456-7890',
    cidade: 'Campinas',
    estado: 'SP',
    area_juridica: 'Família',
    status_lead: 'ativo',
    origem: 'Indicação',
    observacoes: 'Divórcio litigioso com disputa de guarda dos filhos menores.',
  },
  {
    nome: 'Carlos Eduardo Ferreira',
    tipo: 'pf',
    cpf_cnpj: '456.789.012-34',
    email: 'carlos.ferreira@email.com',
    celular: '(11) 94567-8901',
    cidade: 'São Paulo',
    estado: 'SP',
    area_juridica: 'Criminal',
    status_lead: 'ativo',
    origem: 'Instagram',
    observacoes: 'Acusado de estelionato em negócio imobiliário. Nega as acusações.',
  },
  {
    nome: 'Fernanda Lima Rodrigues',
    tipo: 'pf',
    cpf_cnpj: '567.890.123-45',
    email: 'fernanda.lima@email.com',
    celular: '(21) 95678-9012',
    cidade: 'Niterói',
    estado: 'RJ',
    area_juridica: 'Trabalhista',
    status_lead: 'ativo',
    origem: 'Google',
    observacoes: 'Assédio moral no trabalho. Tem provas documentais e testemunhas.',
  },
  {
    nome: 'Pedro Henrique Alves',
    tipo: 'pf',
    cpf_cnpj: '678.901.234-56',
    email: 'pedro.alves@email.com',
    celular: '(11) 96789-0123',
    cidade: 'São Paulo',
    estado: 'SP',
    area_juridica: 'Cível',
    status_lead: 'encerrado',
    origem: 'Indicação',
    observacoes: 'Ação de cobrança encerrada com êxito. Cliente satisfeito.',
  },
  {
    nome: 'Empresa XYZ Comércio Ltda',
    tipo: 'pj',
    cpf_cnpj: '12.345.678/0001-90',
    email: 'juridico@xyzcomercio.com.br',
    telefone: '(11) 3333-4444',
    cidade: 'São Paulo',
    estado: 'SP',
    area_juridica: 'Empresarial',
    status_lead: 'ativo',
    origem: 'Prospecção',
    observacoes: 'Empresa de médio porte. Contrato de assessoria jurídica mensal.',
  },
  {
    nome: 'Roberto Carlos Gomes',
    tipo: 'pf',
    cpf_cnpj: '789.012.345-67',
    email: 'roberto.gomes@email.com',
    celular: '(31) 97890-1234',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    area_juridica: 'Previdenciário',
    status_lead: 'prospecto',
    origem: 'Facebook',
    observacoes: 'Aposentadoria por invalidez negada pelo INSS. Quer recurso administrativo ou judicial.',
  },
  {
    nome: 'Lúcia Helena Pereira',
    tipo: 'pf',
    cpf_cnpj: '890.123.456-78',
    email: 'lucia.pereira@email.com',
    celular: '(11) 98901-2345',
    cidade: 'Guarulhos',
    estado: 'SP',
    area_juridica: 'Consumidor',
    status_lead: 'qualificado',
    origem: 'Indicação',
    observacoes: 'Produto com defeito de fabricante. Loja recusa troca. Valor ~R$ 4.500.',
  },
  {
    nome: 'Marcos Vinícius Souza',
    tipo: 'pf',
    cpf_cnpj: '901.234.567-89',
    email: 'marcos.souza@email.com',
    celular: '(21) 99012-3456',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    area_juridica: 'Trabalhista',
    status_lead: 'perdido',
    origem: 'Google',
    observacoes: 'Optou por contratar outro escritório. Mantemos o contato para futuras demandas.',
  },
  {
    nome: 'Beatriz Ramos de Oliveira',
    tipo: 'pf',
    cpf_cnpj: '012.345.678-90',
    email: 'beatriz.ramos@email.com',
    celular: '(11) 90123-4567',
    cidade: 'São Bernardo do Campo',
    estado: 'SP',
    area_juridica: 'Imobiliário',
    status_lead: 'ativo',
    origem: 'Instagram',
    observacoes: 'Rescisão contratual de compra de imóvel. Incorporadora atrasou 18 meses.',
  },
  {
    nome: 'Transportadora ABC Logística S/A',
    tipo: 'pj',
    cpf_cnpj: '98.765.432/0001-10',
    email: 'juridico@abclogistica.com.br',
    telefone: '(11) 4444-5555',
    cidade: 'São Paulo',
    estado: 'SP',
    area_juridica: 'Empresarial',
    status_lead: 'qualificado',
    origem: 'Prospecção',
    observacoes: 'Disputa contratual com grande cliente. Valor em causa ~R$ 850.000.',
  },
];

const clienteIds = [];
for (const c of clientes) {
  // Verificar se já existe para não duplicar ao re-executar
  const existe = await db.prepare('SELECT id FROM clientes WHERE cpf_cnpj = ?').get(c.cpf_cnpj);
  if (existe) {
    clienteIds.push(existe.id);
    console.log(`  ⏭️  Cliente já existe: ${c.nome}`);
    continue;
  }
  const res = await db.prepare(`
    INSERT INTO clientes (nome, tipo, cpf_cnpj, email, telefone, celular, cidade, estado,
      area_juridica, status_lead, origem, observacoes, responsavel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    c.nome, c.tipo, c.cpf_cnpj, c.email || null, c.telefone || null, c.celular || null,
    c.cidade, c.estado, c.area_juridica, c.status_lead, c.origem, c.observacoes, adminId
  );
  clienteIds.push(res.lastInsertRowid);
  console.log(`  ✅ Cliente criado: ${c.nome} [${c.status_lead}]`);
}

// ============================================================
// PROCESSOS
// ============================================================

const hoje = new Date();
const anoPassado = hoje.getFullYear() - 1;
const doisAnosAtras = hoje.getFullYear() - 2;

const processos = [
  {
    clienteIdx: 2, // Ana Paula Costa
    numero_cnj: `0003456-78.${anoPassado}.8.19.0001`,
    tribunal: 'TJRJ',
    vara: '2ª Vara de Família',
    comarca: 'Rio de Janeiro',
    classe_processual: 'Divórcio Litigioso',
    assunto: 'Dissolução de Sociedade Conjugal - Guarda de Filhos',
    polo_ativo: 'Ana Paula Costa',
    polo_passivo: 'Ricardo da Costa',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-03-15`,
    valor_causa: 'R$ 150.000,00',
    observacoes: 'Audiência de conciliação realizada sem acordo. Aguardando estudo social.',
  },
  {
    clienteIdx: 3, // Carlos Eduardo Ferreira
    numero_cnj: `0004567-89.${anoPassado}.8.26.0224`,
    tribunal: 'TJSP',
    vara: '3ª Vara Criminal',
    comarca: 'São Paulo',
    classe_processual: 'Ação Penal - Procedimento Ordinário',
    assunto: 'Estelionato (art. 171 CP)',
    polo_ativo: 'Ministério Público',
    polo_passivo: 'Carlos Eduardo Ferreira',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-07-20`,
    valor_causa: '',
    observacoes: 'Réu responde em liberdade. Aguardando instrução criminal.',
  },
  {
    clienteIdx: 4, // Fernanda Lima
    numero_cnj: `0005678-90.${anoPassado}.5.02.0001`,
    tribunal: 'TRT2',
    vara: '14ª Vara do Trabalho de São Paulo',
    comarca: 'São Paulo',
    classe_processual: 'Reclamação Trabalhista',
    assunto: 'Assédio Moral - Dano Moral - Verbas Rescisórias',
    polo_ativo: 'Fernanda Lima Rodrigues',
    polo_passivo: 'Comércio e Varejo Paulista Ltda',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-09-05`,
    valor_causa: 'R$ 45.000,00',
    observacoes: 'Reclamada contestou. Perícia técnica deferida pelo juízo.',
  },
  {
    clienteIdx: 5, // Pedro Henrique Alves
    numero_cnj: `0006789-01.${doisAnosAtras}.8.26.0001`,
    tribunal: 'TJSP',
    vara: '5ª Vara Cível',
    comarca: 'São Paulo',
    classe_processual: 'Ação de Cobrança',
    assunto: 'Cobrança de dívida - Contrato de prestação de serviços',
    polo_ativo: 'Pedro Henrique Alves',
    polo_passivo: 'Empresa Devedora ME',
    status: 'encerrado',
    data_distribuicao: `${doisAnosAtras}-02-10`,
    valor_causa: 'R$ 28.500,00',
    observacoes: 'Processo encerrado com acordo. Valor pago integralmente.',
  },
  {
    clienteIdx: 6, // Empresa XYZ
    numero_cnj: `0007890-12.${anoPassado}.4.03.6100`,
    tribunal: 'TRF3',
    vara: '2ª Vara Federal de São Paulo',
    comarca: 'São Paulo',
    classe_processual: 'Mandado de Segurança',
    assunto: 'Imposto de Renda - Exclusão de Benefícios Fiscais',
    polo_ativo: 'Empresa XYZ Comércio Ltda',
    polo_passivo: 'União Federal',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-04-18`,
    valor_causa: 'R$ 320.000,00',
    observacoes: 'Liminar deferida. Aguardando informações da autoridade coatora.',
  },
  {
    clienteIdx: 10, // Beatriz Ramos
    numero_cnj: `0001122-33.${anoPassado}.8.26.0100`,
    tribunal: 'TJSP',
    vara: '1ª Vara Cível',
    comarca: 'São Bernardo do Campo',
    classe_processual: 'Ação de Rescisão Contratual c/c Devolução de Valores',
    assunto: 'Rescisão de promessa de compra e venda - atraso na entrega',
    polo_ativo: 'Beatriz Ramos de Oliveira',
    polo_passivo: 'Construtora Futuro S/A',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-11-03`,
    valor_causa: 'R$ 480.000,00',
    observacoes: 'Inicial protocolada. Aguardando citação da ré.',
  },
  {
    clienteIdx: 11, // Transportadora ABC
    numero_cnj: `0009988-77.${anoPassado}.8.26.0001`,
    tribunal: 'TJSP',
    vara: '8ª Vara Cível',
    comarca: 'São Paulo',
    classe_processual: 'Ação de Cobrança',
    assunto: 'Cobrança de serviços de transporte - contrato inadimplido',
    polo_ativo: 'Transportadora ABC Logística S/A',
    polo_passivo: 'Distribuidora Nacional de Alimentos Ltda',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-08-22`,
    valor_causa: 'R$ 850.000,00',
    observacoes: 'Ré contestou negando os valores. Réplica protocolada.',
  },
  {
    clienteIdx: 0, // Maria Aparecida Santos
    numero_cnj: `0002233-44.${anoPassado}.5.02.0030`,
    tribunal: 'TRT2',
    vara: '30ª Vara do Trabalho de São Paulo',
    comarca: 'São Paulo',
    classe_processual: 'Reclamação Trabalhista',
    assunto: 'Dispensa sem justa causa - FGTS - Aviso prévio - Férias',
    polo_ativo: 'Maria Aparecida Santos',
    polo_passivo: 'Indústria e Comércio Bom Preço Ltda',
    status: 'em_andamento',
    data_distribuicao: `${anoPassado}-12-10`,
    valor_causa: 'R$ 72.000,00',
    observacoes: 'Reclamação distribuída. Aguardando audiência inaugural.',
  },
];

const processoIds = [];
for (const p of processos) {
  const clienteId = clienteIds[p.clienteIdx];
  if (!clienteId) { processoIds.push(null); continue; }

  const existe = await db.prepare('SELECT id FROM processos WHERE numero_cnj = ?').get(p.numero_cnj);
  if (existe) {
    processoIds.push(existe.id);
    console.log(`  ⏭️  Processo já existe: ${p.numero_cnj}`);
    continue;
  }

  const res = await db.prepare(`
    INSERT INTO processos (
      cliente_id, numero_cnj, tribunal, vara, comarca, classe_processual,
      assunto, polo_ativo, polo_passivo, status, data_distribuicao, valor_causa, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clienteId, p.numero_cnj, p.tribunal, p.vara, p.comarca,
    p.classe_processual, p.assunto, p.polo_ativo, p.polo_passivo,
    p.status, p.data_distribuicao, p.valor_causa, p.observacoes
  );
  processoIds.push(res.lastInsertRowid);
  console.log(`  ✅ Processo criado: ${p.numero_cnj} [${p.tribunal}]`);
}

// ============================================================
// MOVIMENTAÇÕES
// ============================================================

function mesesAtras(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const movimentacoes = [
  // Processo 0 - Divórcio (Ana Paula)
  { processoIdx: 0, data: mesesAtras(6), descricao: 'Petição inicial distribuída', nova: 0 },
  { processoIdx: 0, data: mesesAtras(5), descricao: 'Citação do réu realizada', nova: 0 },
  { processoIdx: 0, data: mesesAtras(4), descricao: 'Contestação apresentada pelo réu', nova: 0 },
  { processoIdx: 0, data: mesesAtras(3), descricao: 'Audiência de conciliação realizada - sem acordo', nova: 0 },
  { processoIdx: 0, data: mesesAtras(2), descricao: 'Decisão: determina estudo social dos filhos menores', complemento: 'Prazo: 60 dias para laudo', nova: 0 },
  { processoIdx: 0, data: diasAtras(15), descricao: 'Laudo do estudo social juntado aos autos', nova: 1 },
  { processoIdx: 0, data: diasAtras(5), descricao: 'Intimação para manifestação sobre o laudo social', nova: 1 },

  // Processo 1 - Criminal (Carlos)
  { processoIdx: 1, data: mesesAtras(8), descricao: 'Recebimento da denúncia', nova: 0 },
  { processoIdx: 1, data: mesesAtras(7), descricao: 'Citação do acusado', nova: 0 },
  { processoIdx: 1, data: mesesAtras(6), descricao: 'Resposta à acusação apresentada', nova: 0 },
  { processoIdx: 1, data: mesesAtras(4), descricao: 'Audiência de instrução e julgamento - 1ª sessão', complemento: 'Ouvidas 2 testemunhas de acusação', nova: 0 },
  { processoIdx: 1, data: mesesAtras(2), descricao: 'Audiência de instrução e julgamento - 2ª sessão', complemento: 'Ouvidas testemunhas de defesa', nova: 0 },
  { processoIdx: 1, data: diasAtras(10), descricao: 'Alegações finais do Ministério Público juntadas', nova: 1 },

  // Processo 2 - Trabalhista (Fernanda)
  { processoIdx: 2, data: mesesAtras(5), descricao: 'Reclamação trabalhista distribuída', nova: 0 },
  { processoIdx: 2, data: mesesAtras(4), descricao: 'Audiência inaugural realizada', complemento: 'Proposta de conciliação rejeitada pela parte reclamante', nova: 0 },
  { processoIdx: 2, data: mesesAtras(3), descricao: 'Contestação da reclamada apresentada', nova: 0 },
  { processoIdx: 2, data: mesesAtras(2), descricao: 'Réplica do reclamante protocolada', nova: 0 },
  { processoIdx: 2, data: mesesAtras(1), descricao: 'Decisão saneadora - perícia técnica deferida', nova: 0 },
  { processoIdx: 2, data: diasAtras(3), descricao: 'Perito nomeado - intimação para indicar assistente técnico', nova: 1 },

  // Processo 3 - Encerrado (Pedro)
  { processoIdx: 3, data: mesesAtras(14), descricao: 'Ação de cobrança distribuída', nova: 0 },
  { processoIdx: 3, data: mesesAtras(12), descricao: 'Citação realizada', nova: 0 },
  { processoIdx: 3, data: mesesAtras(10), descricao: 'Contestação apresentada', nova: 0 },
  { processoIdx: 3, data: mesesAtras(6), descricao: 'Audiência de conciliação - acordo realizado', complemento: 'Valor: R$ 28.500,00 em 3 parcelas', nova: 0 },
  { processoIdx: 3, data: mesesAtras(3), descricao: 'Homologação de acordo pelo juízo', nova: 0 },
  { processoIdx: 3, data: mesesAtras(1), descricao: 'Pagamento integral comprovado - processo extinto', nova: 0 },

  // Processo 4 - MS Federal (Empresa XYZ)
  { processoIdx: 4, data: mesesAtras(7), descricao: 'Mandado de segurança impetrado', nova: 0 },
  { processoIdx: 4, data: mesesAtras(6), descricao: 'Liminar deferida - suspensão do lançamento fiscal', nova: 0 },
  { processoIdx: 4, data: mesesAtras(5), descricao: 'Notificação à autoridade coatora', nova: 0 },
  { processoIdx: 4, data: mesesAtras(3), descricao: 'Informações da Receita Federal juntadas aos autos', nova: 0 },
  { processoIdx: 4, data: diasAtras(20), descricao: 'Parecer do MPF juntado - manifestação favorável à empresa', nova: 1 },
  { processoIdx: 4, data: diasAtras(7), descricao: 'Intimação: processo incluído em pauta para julgamento', nova: 1 },

  // Processo 5 - Imobiliário (Beatriz)
  { processoIdx: 5, data: mesesAtras(3), descricao: 'Petição inicial distribuída', nova: 0 },
  { processoIdx: 5, data: mesesAtras(2), descricao: 'Tentativa de citação - endereço não localizado', nova: 0 },
  { processoIdx: 5, data: diasAtras(8), descricao: 'Citação por edital deferida pelo juízo', nova: 1 },

  // Processo 6 - Cobrança (Transportadora ABC)
  { processoIdx: 6, data: mesesAtras(5), descricao: 'Ação de cobrança distribuída', nova: 0 },
  { processoIdx: 6, data: mesesAtras(4), descricao: 'Citação da ré realizada', nova: 0 },
  { processoIdx: 6, data: mesesAtras(3), descricao: 'Contestação apresentada com documentos', nova: 0 },
  { processoIdx: 6, data: mesesAtras(2), descricao: 'Réplica apresentada rebatendo os argumentos da ré', nova: 0 },
  { processoIdx: 6, data: diasAtras(12), descricao: 'Perícia contábil deferida pelo juízo', nova: 1 },

  // Processo 7 - Trabalhista (Maria Aparecida)
  { processoIdx: 7, data: mesesAtras(2), descricao: 'Reclamação trabalhista distribuída', nova: 0 },
  { processoIdx: 7, data: diasAtras(30), descricao: 'Notificação da reclamada para apresentar documentos', nova: 0 },
  { processoIdx: 7, data: diasAtras(2), descricao: 'Audiência inaugural designada para 15/04/2026', nova: 1 },
];

let movsInseridas = 0;
for (const m of movimentacoes) {
  const processoId = processoIds[m.processoIdx];
  if (!processoId) continue;

  const existe = await db.prepare(
    'SELECT id FROM movimentacoes WHERE processo_id = ? AND data_movimentacao = ? AND descricao = ?'
  ).get(processoId, m.data, m.descricao);

  if (!existe) {
    await db.prepare(`
      INSERT INTO movimentacoes (processo_id, data_movimentacao, descricao, complemento, nova)
      VALUES (?, ?, ?, ?, ?)
    `).run(processoId, m.data, m.descricao, m.complemento || null, m.nova);
    movsInseridas++;
  }
}
console.log(`  ✅ ${movsInseridas} movimentações inseridas`);

// Atualizar última movimentação de cada processo
for (let i = 0; i < processoIds.length; i++) {
  const pid = processoIds[i];
  if (!pid) continue;
  const ultima = await db.prepare(
    'SELECT descricao FROM movimentacoes WHERE processo_id = ? ORDER BY data_movimentacao DESC LIMIT 1'
  ).get(pid);
  if (ultima) {
    await db.prepare('UPDATE processos SET ultima_movimentacao = ? WHERE id = ?').run(ultima.descricao, pid);
  }
}

// ============================================================
// ANOTAÇÕES / TIMELINE
// ============================================================

const anotacoes = [
  { clienteIdx: 0, tipo: 'reuniao', titulo: 'Reunião inicial', descricao: 'Cliente relatou dispensa após 8 anos. Documentos recebidos: CTPS, carta de demissão, recibos de pagamento.', data: mesesAtras(3) },
  { clienteIdx: 0, tipo: 'email', titulo: 'Envio de orientações', descricao: 'Enviado e-mail com orientações sobre o processo trabalhista e prazo de prescrição.', data: mesesAtras(2) },
  { clienteIdx: 1, tipo: 'ligacao', titulo: 'Primeira consulta telefônica', descricao: 'Cliente ligou relatando acidente. Orientado a reunir documentos e fotos do sinistro.', data: mesesAtras(4) },
  { clienteIdx: 2, tipo: 'reuniao', titulo: 'Estratégia do divórcio', descricao: 'Reunião para definir estratégia. Cliente quer guarda compartilhada mas teme que cônjuge peça guarda exclusiva.', data: mesesAtras(7) },
  { clienteIdx: 3, tipo: 'reuniao', titulo: 'Análise do caso criminal', descricao: 'Examinados os documentos da acusação. Réu nega ter praticado estelionato. Há mensagens que corroboram a versão da defesa.', data: mesesAtras(9) },
  { clienteIdx: 4, tipo: 'reuniao', titulo: 'Consulta sobre assédio moral', descricao: 'Cliente apresentou prints de mensagens, e-mails e relatos de 3 testemunhas sobre situações de humilhação pública.', data: mesesAtras(6) },
  { clienteIdx: 6, tipo: 'reuniao', titulo: 'Reunião de assessoria mensal', descricao: 'Revisados os contratos vigentes. Identificadas 2 cláusulas potencialmente problemáticas nos contratos com fornecedores.', data: diasAtras(20) },
  { clienteIdx: 9, tipo: 'nota', titulo: 'Análise do produto', descricao: 'Laudo técnico confirma defeito de fabricação. Fabricante e loja solidariamente responsáveis pelo CDC.', data: diasAtras(10) },
  { clienteIdx: 10, tipo: 'reuniao', titulo: 'Análise da ação contra construtora', descricao: 'Levantados todos os documentos: contrato, comprovantes de pagamento, registros fotográficos do imóvel inacabado.', data: mesesAtras(4) },
  { clienteIdx: 11, tipo: 'ligacao', titulo: 'Reunião de avaliação do caso', descricao: 'Empresa confirma que prestou todos os serviços. Possui notas fiscais e canhotos de entrega assinados pelo cliente devedor.', data: mesesAtras(6) },
];

let anotInserted = 0;
for (const a of anotacoes) {
  const clienteId = clienteIds[a.clienteIdx];
  if (!clienteId) continue;

  const existe = await db.prepare(
    'SELECT id FROM anotacoes WHERE cliente_id = ? AND titulo = ?'
  ).get(clienteId, a.titulo);

  if (!existe) {
    await db.prepare(`
      INSERT INTO anotacoes (cliente_id, usuario_id, tipo, titulo, descricao, data_atividade)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(clienteId, adminId, a.tipo, a.titulo, a.descricao, a.data + 'T10:00:00');
    anotInserted++;
  }
}
console.log(`  ✅ ${anotInserted} anotações inseridas`);

// ============================================================
// PRAZOS
// ============================================================

function diasFuturos(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const prazos = [
  {
    processoIdx: 2, clienteIdx: 4,
    titulo: 'Indicar assistente técnico - Perícia trabalhista',
    descricao: 'Indicar nome e qualificação do assistente técnico ao perito nomeado pelo juízo.',
    tipo: 'prazo', data: diasFuturos(2), hora: '23:59', prioridade: 'urgente',
  },
  {
    processoIdx: 0, clienteIdx: 2,
    titulo: 'Manifestação sobre laudo de estudo social',
    descricao: 'Analisar o laudo do estudo social e apresentar impugnação ou concordância fundamentada.',
    tipo: 'prazo', data: diasFuturos(5), hora: '23:59', prioridade: 'alta',
  },
  {
    processoIdx: 4, clienteIdx: 6,
    titulo: 'Sustentação oral no TRF3',
    descricao: 'Julgamento do mandado de segurança incluído em pauta. Preparar sustentação oral.',
    tipo: 'audiencia', data: diasFuturos(3), hora: '14:00', prioridade: 'urgente',
  },
  {
    processoIdx: 7, clienteIdx: 0,
    titulo: 'Audiência inaugural - Reclamatória Maria Santos',
    descricao: 'Audiência inaugural no TRT2 - 30ª Vara. Levar todos os documentos da CTPS e rescisão.',
    tipo: 'audiencia', data: '2026-04-15', hora: '09:00', prioridade: 'alta',
  },
  {
    processoIdx: 6, clienteIdx: 11,
    titulo: 'Indicar quesitos ao perito contábil',
    descricao: 'Elaborar quesitos específicos para a perícia contábil no processo de cobrança contra distribuidora.',
    tipo: 'prazo', data: diasFuturos(10), hora: '23:59', prioridade: 'normal',
  },
  {
    processoIdx: null, clienteIdx: 1,
    titulo: 'Reunião de consulta - João Oliveira',
    descricao: 'Reunião presencial para avaliar documentos do acidente de trânsito e decidir pela propositura da ação.',
    tipo: 'reuniao', data: diasFuturos(6), hora: '10:30', prioridade: 'normal',
  },
  {
    processoIdx: 5, clienteIdx: 10,
    titulo: 'Acompanhar publicação da citação por edital',
    descricao: 'Verificar publicação do edital de citação no Diário Oficial. Prazo fatal para início do prazo.',
    tipo: 'tarefa', data: diasFuturos(14), prioridade: 'alta',
  },
];

let prazosInseridos = 0;
for (const p of prazos) {
  const clienteId = clienteIds[p.clienteIdx];
  const processoId = p.processoIdx !== null ? processoIds[p.processoIdx] : null;

  const existe = await db.prepare('SELECT id FROM prazos WHERE titulo = ? AND data_vencimento = ?').get(p.titulo, p.data);
  if (!existe) {
    await db.prepare(`
      INSERT INTO prazos (processo_id, cliente_id, titulo, descricao, tipo, data_vencimento, hora, prioridade, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(processoId || null, clienteId || null, p.titulo, p.descricao, p.tipo, p.data, p.hora || null, p.prioridade, adminId);
    prazosInseridos++;
  }
}
console.log(`  ✅ ${prazosInseridos} prazos inseridos`);

// ============================================================
// RESULTADO FINAL
// ============================================================

const totais = {
  clientes: (await db.prepare('SELECT COUNT(*) as n FROM clientes').get()).n,
  processos: (await db.prepare('SELECT COUNT(*) as n FROM processos').get()).n,
  movimentacoes: (await db.prepare('SELECT COUNT(*) as n FROM movimentacoes').get()).n,
  movNovas: (await db.prepare('SELECT COUNT(*) as n FROM movimentacoes WHERE nova = 1').get()).n,
  anotacoes: (await db.prepare('SELECT COUNT(*) as n FROM anotacoes').get()).n,
  prazos: (await db.prepare('SELECT COUNT(*) as n FROM prazos').get()).n,
};

console.log('\n📊 Estado atual do banco:');
console.log(`   Clientes:        ${totais.clientes}`);
console.log(`   Processos:       ${totais.processos}`);
console.log(`   Movimentações:   ${totais.movimentacoes} (${totais.movNovas} novas)`);
console.log(`   Anotações:       ${totais.anotacoes}`);
console.log(`   Prazos:          ${totais.prazos}`);
console.log('\n✅ Seed concluído com sucesso!');

}

main().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});
