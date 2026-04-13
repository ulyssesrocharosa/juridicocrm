const axios = require('axios');

// ============================================================
//  SERVIÇO DATAJUD - API Pública do CNJ
// ============================================================

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || '';
const BASE_URL = process.env.DATAJUD_BASE_URL || 'https://api-publica.datajud.cnj.jus.br';

// Lista estruturada de tribunais para seleção no frontend
const LISTA_TRIBUNAIS = [
  {
    grupo: 'Tribunais Superiores',
    tribunais: [
      { codigo: 'STF',  nome: 'STF - Supremo Tribunal Federal',          alias: 'api_publica_stf'  },
      { codigo: 'STJ',  nome: 'STJ - Superior Tribunal de Justiça',      alias: 'api_publica_stj'  },
      { codigo: 'TST',  nome: 'TST - Tribunal Superior do Trabalho',     alias: 'api_publica_tst'  },
      { codigo: 'TSE',  nome: 'TSE - Tribunal Superior Eleitoral',       alias: 'api_publica_tse'  },
      { codigo: 'STM',  nome: 'STM - Superior Tribunal Militar',         alias: 'api_publica_stm'  },
    ]
  },
  {
    grupo: 'Justiça Federal (TRF)',
    tribunais: [
      { codigo: 'TRF1', nome: 'TRF1 - 1ª Região (DF, GO, MT, PA, BA...)', alias: 'api_publica_trf1' },
      { codigo: 'TRF2', nome: 'TRF2 - 2ª Região (RJ, ES)',                 alias: 'api_publica_trf2' },
      { codigo: 'TRF3', nome: 'TRF3 - 3ª Região (SP, MS)',                 alias: 'api_publica_trf3' },
      { codigo: 'TRF4', nome: 'TRF4 - 4ª Região (PR, SC, RS)',             alias: 'api_publica_trf4' },
      { codigo: 'TRF5', nome: 'TRF5 - 5ª Região (CE, AL, PB, PE, RN, SE)', alias: 'api_publica_trf5' },
      { codigo: 'TRF6', nome: 'TRF6 - 6ª Região (MG)',                     alias: 'api_publica_trf6' },
    ]
  },
  {
    grupo: 'Justiça do Trabalho (TRT)',
    tribunais: [
      { codigo: 'TRT1',  nome: 'TRT1  - Rio de Janeiro',             alias: 'api_publica_trt1'  },
      { codigo: 'TRT2',  nome: 'TRT2  - São Paulo (Capital)',         alias: 'api_publica_trt2'  },
      { codigo: 'TRT3',  nome: 'TRT3  - Minas Gerais',               alias: 'api_publica_trt3'  },
      { codigo: 'TRT4',  nome: 'TRT4  - Rio Grande do Sul',          alias: 'api_publica_trt4'  },
      { codigo: 'TRT5',  nome: 'TRT5  - Bahia',                      alias: 'api_publica_trt5'  },
      { codigo: 'TRT6',  nome: 'TRT6  - Pernambuco',                 alias: 'api_publica_trt6'  },
      { codigo: 'TRT7',  nome: 'TRT7  - Ceará',                      alias: 'api_publica_trt7'  },
      { codigo: 'TRT8',  nome: 'TRT8  - Pará e Amapá',               alias: 'api_publica_trt8'  },
      { codigo: 'TRT9',  nome: 'TRT9  - Paraná',                     alias: 'api_publica_trt9'  },
      { codigo: 'TRT10', nome: 'TRT10 - Distrito Federal e Tocantins', alias: 'api_publica_trt10' },
      { codigo: 'TRT11', nome: 'TRT11 - Amazonas e Roraima',         alias: 'api_publica_trt11' },
      { codigo: 'TRT12', nome: 'TRT12 - Santa Catarina',             alias: 'api_publica_trt12' },
      { codigo: 'TRT13', nome: 'TRT13 - Paraíba',                    alias: 'api_publica_trt13' },
      { codigo: 'TRT14', nome: 'TRT14 - Rondônia e Acre',            alias: 'api_publica_trt14' },
      { codigo: 'TRT15', nome: 'TRT15 - Campinas / SP Interior',     alias: 'api_publica_trt15' },
      { codigo: 'TRT16', nome: 'TRT16 - Maranhão',                   alias: 'api_publica_trt16' },
      { codigo: 'TRT17', nome: 'TRT17 - Espírito Santo',             alias: 'api_publica_trt17' },
      { codigo: 'TRT18', nome: 'TRT18 - Goiás',                      alias: 'api_publica_trt18' },
      { codigo: 'TRT19', nome: 'TRT19 - Alagoas',                    alias: 'api_publica_trt19' },
      { codigo: 'TRT20', nome: 'TRT20 - Sergipe',                    alias: 'api_publica_trt20' },
      { codigo: 'TRT21', nome: 'TRT21 - Rio Grande do Norte',        alias: 'api_publica_trt21' },
      { codigo: 'TRT22', nome: 'TRT22 - Piauí',                      alias: 'api_publica_trt22' },
      { codigo: 'TRT23', nome: 'TRT23 - Mato Grosso',                alias: 'api_publica_trt23' },
      { codigo: 'TRT24', nome: 'TRT24 - Mato Grosso do Sul',         alias: 'api_publica_trt24' },
    ]
  },
  {
    grupo: 'Justiça Estadual (TJ)',
    tribunais: [
      { codigo: 'TJAC',  nome: 'TJAC  - Acre',                   alias: 'api_publica_tjac'  },
      { codigo: 'TJAL',  nome: 'TJAL  - Alagoas',                alias: 'api_publica_tjal'  },
      { codigo: 'TJAP',  nome: 'TJAP  - Amapá',                  alias: 'api_publica_tjap'  },
      { codigo: 'TJAM',  nome: 'TJAM  - Amazonas',               alias: 'api_publica_tjam'  },
      { codigo: 'TJBA',  nome: 'TJBA  - Bahia',                  alias: 'api_publica_tjba'  },
      { codigo: 'TJCE',  nome: 'TJCE  - Ceará',                  alias: 'api_publica_tjce'  },
      { codigo: 'TJDFT', nome: 'TJDFT - Distrito Federal',       alias: 'api_publica_tjdft' },
      { codigo: 'TJES',  nome: 'TJES  - Espírito Santo',         alias: 'api_publica_tjes'  },
      { codigo: 'TJGO',  nome: 'TJGO  - Goiás',                  alias: 'api_publica_tjgo'  },
      { codigo: 'TJMA',  nome: 'TJMA  - Maranhão',               alias: 'api_publica_tjma'  },
      { codigo: 'TJMT',  nome: 'TJMT  - Mato Grosso',            alias: 'api_publica_tjmt'  },
      { codigo: 'TJMS',  nome: 'TJMS  - Mato Grosso do Sul',     alias: 'api_publica_tjms'  },
      { codigo: 'TJMG',  nome: 'TJMG  - Minas Gerais',           alias: 'api_publica_tjmg'  },
      { codigo: 'TJPA',  nome: 'TJPA  - Pará',                   alias: 'api_publica_tjpa'  },
      { codigo: 'TJPB',  nome: 'TJPB  - Paraíba',                alias: 'api_publica_tjpb'  },
      { codigo: 'TJPR',  nome: 'TJPR  - Paraná',                 alias: 'api_publica_tjpr'  },
      { codigo: 'TJPE',  nome: 'TJPE  - Pernambuco',             alias: 'api_publica_tjpe'  },
      { codigo: 'TJPI',  nome: 'TJPI  - Piauí',                  alias: 'api_publica_tjpi'  },
      { codigo: 'TJRJ',  nome: 'TJRJ  - Rio de Janeiro',         alias: 'api_publica_tjrj'  },
      { codigo: 'TJRN',  nome: 'TJRN  - Rio Grande do Norte',    alias: 'api_publica_tjrn'  },
      { codigo: 'TJRS',  nome: 'TJRS  - Rio Grande do Sul',      alias: 'api_publica_tjrs'  },
      { codigo: 'TJRO',  nome: 'TJRO  - Rondônia',               alias: 'api_publica_tjro'  },
      { codigo: 'TJRR',  nome: 'TJRR  - Roraima',                alias: 'api_publica_tjrr'  },
      { codigo: 'TJSC',  nome: 'TJSC  - Santa Catarina',         alias: 'api_publica_tjsc'  },
      { codigo: 'TJSE',  nome: 'TJSE  - Sergipe',                alias: 'api_publica_tjse'  },
      { codigo: 'TJSP',  nome: 'TJSP  - São Paulo',              alias: 'api_publica_tjsp'  },
      { codigo: 'TJTO',  nome: 'TJTO  - Tocantins',              alias: 'api_publica_tjto'  },
    ]
  }
];

// Mapeamento de tribunais por prefixo do número CNJ
const TRIBUNAIS_MAP = {
  '01': 'api_publica_stf',
  '02': 'api_publica_stj',
  '03': 'api_publica_tst',
  '04': 'api_publica_tse',
  '05': 'api_publica_stm',
  '06': 'api_publica_cjf',
  '07': 'api_publica_trf1',
  '08': 'api_publica_trf2',
  '09': 'api_publica_trf3',
  '10': 'api_publica_trf4',
  '11': 'api_publica_trf5',
  '12': 'api_publica_trf6',
  '13': 'api_publica_tst',
  '14': 'api_publica_trt1',
  '15': 'api_publica_trt2',
  '16': 'api_publica_trt3',
  '17': 'api_publica_trt4',
  '18': 'api_publica_trt5',
  '19': 'api_publica_trt6',
  '20': 'api_publica_trt7',
  '21': 'api_publica_trt8',
  '22': 'api_publica_trt9',
  '23': 'api_publica_trt10',
  '24': 'api_publica_trt11',
  '25': 'api_publica_trt12',
  '26': 'api_publica_trt13',
  '27': 'api_publica_trt14',
  '28': 'api_publica_trt15',
  '29': 'api_publica_trt16',
  '30': 'api_publica_trt17',
  '31': 'api_publica_trt18',
  '32': 'api_publica_trt19',
  '33': 'api_publica_trt20',
  '34': 'api_publica_trt21',
  '35': 'api_publica_trt22',
  '36': 'api_publica_trt23',
  '37': 'api_publica_trt24',
  // Tribunais estaduais
  '800': 'api_publica_tjac',
  '801': 'api_publica_tjal',
  '802': 'api_publica_tjap',
  '803': 'api_publica_tjam',
  '804': 'api_publica_tjba',
  '805': 'api_publica_tjce',
  '806': 'api_publica_tjdft',
  '807': 'api_publica_tjes',
  '808': 'api_publica_tjgo',
  '809': 'api_publica_tjma',
  '810': 'api_publica_tjmt',
  '811': 'api_publica_tjms',
  '812': 'api_publica_tjmg',
  '813': 'api_publica_tjpa',
  '814': 'api_publica_tjpb',
  '815': 'api_publica_tjpr',
  '816': 'api_publica_tjpe',
  '817': 'api_publica_tjpi',
  '818': 'api_publica_tjrj',
  '819': 'api_publica_tjrn',
  '820': 'api_publica_tjrs',
  '821': 'api_publica_tjro',
  '822': 'api_publica_tjrr',
  '823': 'api_publica_tjsc',
  '824': 'api_publica_tjse',
  '825': 'api_publica_tjsp',
  '826': 'api_publica_tjto',
};

/**
 * Detecta o alias do tribunal a partir do número CNJ
 * Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
 *   J = segmento da justiça (1 digit)
 *   TT = tribunal dentro do segmento (2 digits)
 *
 * Mapeamento dos códigos no TRIBUNAIS_MAP:
 *   J=1 (superiores STF/STJ):  código = TT       (01=STF, 02=STJ)
 *   J=4 (federal TRF):         código = TT + 6    (TT=01→07=TRF1, TT=06→12=TRF6)
 *   J=5 (trabalhista TRT/TST): código = TT + 13   (TT=00→13=TST, TT=01→14=TRT1)
 *   J=8 (estadual TJ):         código = '8' + TT  (826=TJSP, 818=TJRJ, etc.)
 *   Outros (TSE, STM, etc.):   código = TT direto (04=TSE, 05=STM, 06=CJF)
 */
function detectarTribunal(numeroCNJ) {
  if (!numeroCNJ) return null;

  const match = numeroCNJ.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!match) return null;

  const justica = match[1];
  const tt = match[2];
  const ttNum = parseInt(tt, 10);

  // Justiça estadual (J=8)
  if (justica === '8') {
    return TRIBUNAIS_MAP[`8${tt}`] || null;
  }

  // Justiça Federal - TRF (J=4): TT=01→code 07, TT=02→code 08 ...
  if (justica === '4') {
    const code = String(6 + ttNum).padStart(2, '0');
    return TRIBUNAIS_MAP[code] || null;
  }

  // Justiça do Trabalho - TRT/TST (J=5): TT=00→code 13(TST), TT=01→code 14(TRT1) ...
  if (justica === '5') {
    const code = String(13 + ttNum).padStart(2, '0');
    return TRIBUNAIS_MAP[code] || null;
  }

  // Superiores e demais: usar TT diretamente (01=STF, 02=STJ, 04=TSE, 05=STM, 06=CJF)
  return TRIBUNAIS_MAP[tt] || null;
}

/**
 * Buscar processo pelo número CNJ
 */
async function buscarProcesso(numeroCNJ, tribunalAlias = null) {
  try {
    // Detectar tribunal automaticamente se não informado
    const alias = tribunalAlias || detectarTribunal(numeroCNJ);

    if (!alias) {
      throw new Error('Não foi possível detectar o tribunal pelo número CNJ. Informe o tribunal manualmente.');
    }

    const url = `${BASE_URL}/${alias}/_search`;

    // DataJud armazena o número sem formatação (só dígitos)
    // e o campo é keyword — requer "term" (match tokeniza e não encontra)
    const numeroLimpo = numeroCNJ.replace(/\D/g, '');
    const payload = {
      query: {
        term: {
          numeroProcesso: numeroLimpo
        }
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const hits = response.data?.hits?.hits || [];

    if (hits.length === 0) {
      return { encontrado: false, dados: null, movimentacoes: [] };
    }

    const processo = hits[0]._source;

    // Extrair movimentações
    const movimentacoes = (processo.movimentos || []).map(mov => ({
      data: mov.dataHora || mov.data,
      codigo: mov.codigo,
      nome: mov.nome,
      complemento: mov.complementosTabelados?.map(c => c.nome)?.join(', ') || ''
    })).sort((a, b) => new Date(b.data) - new Date(a.data));

    return {
      encontrado: true,
      tribunalAlias: alias,
      dados: {
        numero: processo.numeroProcesso,
        classe: processo.classe?.nome || '',
        assunto: processo.assuntos?.[0]?.nome || '',
        tribunal: processo.tribunal?.nome || alias,
        orgaoJulgador: processo.orgaoJulgador?.nome || '',
        dataDistribuicao: processo.dataAjuizamento || '',
        grau: processo.grau || '',
        formato: processo.formato?.nome || '',
        nivelSigilo: processo.nivelSigilo || 0
      },
      movimentacoes,
      totalMovimentacoes: movimentacoes.length
    };

  } catch (err) {
    if (err.response?.status === 404) {
      return { encontrado: false, dados: null, movimentacoes: [] };
    }
    throw new Error(`Erro ao consultar DataJud: ${err.message}`);
  }
}

/**
 * Buscar movimentações de um processo e verificar se há novas
 */
async function verificarNovasMovimentacoes(numeroCNJ, tribunalAlias, ultimaMovimentacaoConhecida) {
  try {
    const resultado = await buscarProcesso(numeroCNJ, tribunalAlias);

    if (!resultado.encontrado) return { temNovidades: false, novas: [] };

    if (!ultimaMovimentacaoConhecida) {
      return {
        temNovidades: resultado.movimentacoes.length > 0,
        novas: resultado.movimentacoes.slice(0, 5),
        dados: resultado.dados
      };
    }

    // Filtrar movimentações após a última conhecida
    const dataLimite = new Date(ultimaMovimentacaoConhecida);
    const novas = resultado.movimentacoes.filter(m => new Date(m.data) > dataLimite);

    return {
      temNovidades: novas.length > 0,
      novas,
      dados: resultado.dados
    };
  } catch (err) {
    console.error(`Erro ao verificar novidades do processo ${numeroCNJ}:`, err.message);
    return { temNovidades: false, novas: [], erro: err.message };
  }
}

/**
 * Buscar por número do processo em múltiplos tribunais (quando tribunal não identificado)
 */
async function buscarEmTodosTribunais(numeroCNJ, tribunaisParaTentar = ['api_publica_tjsp', 'api_publica_tjrj', 'api_publica_tjmg']) {
  for (const alias of tribunaisParaTentar) {
    try {
      const resultado = await buscarProcesso(numeroCNJ, alias);
      if (resultado.encontrado) return { ...resultado, tribunalAlias: alias };
    } catch (e) {
      continue;
    }
  }
  return { encontrado: false };
}

/**
 * Converte alias da API (ex: api_publica_tjsp) para código curto (ex: TJSP)
 */
function aliasParaCodigo(alias) {
  for (const grupo of LISTA_TRIBUNAIS) {
    const t = grupo.tribunais.find(t => t.alias === alias);
    if (t) return t.codigo;
  }
  return alias;
}

/**
 * Busca processos no DataJud pelo CPF/CNPJ.
 *
 * LIMITAÇÃO: A API pública do DataJud (api-publica.datajud.cnj.jus.br) NÃO expõe
 * o campo "partes" (com CPF/CNPJ das partes) por questões de privacidade.
 * Esta função tenta mesmo assim, mas retorna array vazio na maioria dos casos.
 *
 * Alternativa real: usar o portal do CNJ (https://processo.stf.jus.br) ou
 * os portais de cada tribunal, que permitem busca por CPF para partes autenticadas.
 */
async function buscarPorDocumento(documento, tribunalAlias = null) {
  // A API pública não suporta busca por CPF/partes — retornar indicativo imediato
  return { suportado: false, resultados: [], motivo: 'A API pública do DataJud não disponibiliza busca por CPF/CNPJ. Use o número CNJ do processo.' };
}

module.exports = {
  buscarProcesso,
  verificarNovasMovimentacoes,
  buscarEmTodosTribunais,
  buscarPorDocumento,
  detectarTribunal,
  aliasParaCodigo,
  TRIBUNAIS_MAP,
  LISTA_TRIBUNAIS
};
