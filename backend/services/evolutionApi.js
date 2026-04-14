const axios = require('axios');

// ============================================================
//  SERVIÇO EVOLUTION API - WhatsApp Integration
// ============================================================

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'juridico-crm';

function getApiClient(config = {}) {
  return axios.create({
    baseURL: config.evolution_url || EVOLUTION_URL,
    headers: {
      'apikey': config.evolution_key || EVOLUTION_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
}

function getInstanceName(config = {}) {
  return config.instance_name || INSTANCE_NAME;
}

/**
 * Criar instância do WhatsApp
 */
async function criarInstancia(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.post('/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    });
    return res.data;
  } catch (err) {
    throw new Error(`Erro ao criar instância: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Obter QR Code para conectar WhatsApp
 */
async function obterQRCode(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.get(`/instance/connect/${instanceName}`);
    return {
      qrcode: res.data?.base64 || res.data?.qrcode?.base64 || null,
      pairingCode: res.data?.pairingCode || null,
      status: res.data?.state || 'pending'
    };
  } catch (err) {
    throw new Error(`Erro ao obter QR Code: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Verificar status da conexão
 */
async function verificarConexao(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.get(`/instance/connectionState/${instanceName}`);
    return {
      conectado: res.data?.instance?.state === 'open',
      estado: res.data?.instance?.state || 'unknown',
      numero: res.data?.instance?.owner || null
    };
  } catch (err) {
    return { conectado: false, estado: 'error', erro: err.message };
  }
}

/**
 * Enviar mensagem de texto
 */
async function enviarMensagem(numero, mensagem, config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const numeroFormatado = formatarNumero(numero);

    const res = await api.post(`/message/sendText/${instanceName}`, {
      number: numeroFormatado,
      text: mensagem
    });

    return {
      sucesso: true,
      messageId: res.data?.key?.id || res.data?.id,
      dados: res.data
    };
  } catch (err) {
    throw new Error(`Erro ao enviar mensagem: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Enviar arquivo/imagem
 */
async function enviarArquivo(numero, url, caption = '', tipo = 'document', config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const numeroFormatado = formatarNumero(numero);
    const endpoint = tipo === 'image' ? 'sendImage' : 'sendMedia';

    const res = await api.post(`/message/${endpoint}/${instanceName}`, {
      number: numeroFormatado,
      mediatype: tipo,
      media: url,
      caption
    });

    return { sucesso: true, dados: res.data };
  } catch (err) {
    throw new Error(`Erro ao enviar arquivo: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Buscar chats/conversas ativas
 */
async function buscarChats(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.get(`/chat/findChats/${instanceName}`);
    return res.data || [];
  } catch (err) {
    console.error('Erro ao buscar chats:', err.message);
    return [];
  }
}

/**
 * Buscar mensagens de uma conversa
 */
async function buscarMensagens(numero, quantidade = 50, config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const numeroFormatado = formatarNumero(numero);
    const res = await api.post(`/chat/findMessages/${instanceName}`, {
      where: {
        key: {
          remoteJid: `${numeroFormatado}@s.whatsapp.net`
        }
      },
      limit: quantidade
    });
    return res.data?.messages || [];
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err.message);
    return [];
  }
}

/**
 * Marcar mensagens como lidas
 */
async function marcarComoLido(numero, config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const numeroFormatado = formatarNumero(numero);
    await api.post(`/chat/markMessageAsRead/${instanceName}`, {
      readMessages: [{
        remoteJid: `${numeroFormatado}@s.whatsapp.net`,
        fromMe: false,
        id: ''
      }]
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Configurar webhook para receber mensagens em tempo real
 */
async function configurarWebhook(webhookUrl, config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.post(`/webhook/set/${instanceName}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED'
        ]
      }
    });
    return res.data;
  } catch (err) {
    throw new Error(`Erro ao configurar webhook: ${err.message}`);
  }
}

/**
 * Desconectar instância
 */
async function desconectar(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    await api.delete(`/instance/logout/${instanceName}`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Buscar chats com atividade recente
 */
async function buscarChatsRecentes(config = {}) {
  try {
    const api = getApiClient(config);
    const instanceName = getInstanceName(config);
    const res = await api.get(`/chat/findChats/${instanceName}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Polling: erro ao buscar chats:', err.message);
    return [];
  }
}

/**
 * Sincronizar mensagens recebidas (polling - funciona sem URL pública)
 */
async function sincronizarMensagensRecentes(sinceTimestamp, config = {}) {
  const api = getApiClient(config);
  const instanceName = getInstanceName(config);
  const chats = await buscarChatsRecentes(config);
  const novas = [];

  const chatsRecentes = chats.filter(c => {
    const ts = c.updatedAt || c.lastMsgTimestamp;
    if (!ts) return false;
    const tsNum = typeof ts === 'number' ? ts : Math.floor(new Date(ts).getTime() / 1000);
    return tsNum >= sinceTimestamp;
  });

  for (const chat of chatsRecentes) {
    try {
      const jid = chat.id || chat.remoteJid;
      if (!jid || jid.includes('@g.us')) continue;

      const res = await api.post(`/chat/findMessages/${instanceName}`, {
        where: { key: { remoteJid: jid, fromMe: false } },
        limit: 20
      });

      const msgs = res.data?.messages?.records || res.data?.records || res.data || [];
      if (!Array.isArray(msgs)) continue;

      for (const msg of msgs) {
        const ts = msg.messageTimestamp || msg.timestamp;
        if (ts && ts >= sinceTimestamp && !msg.key?.fromMe) {
          novas.push({
            tipo: 'mensagem',
            messageId: msg.key?.id,
            numero: jid.replace('@s.whatsapp.net', ''),
            fromMe: false,
            conteudo: msg.message?.conversation ||
                      msg.message?.extendedTextMessage?.text ||
                      msg.message?.imageMessage?.caption || '[mídia]',
            tipoMensagem: msg.message?.imageMessage ? 'imagem' :
                          msg.message?.audioMessage ? 'audio' :
                          msg.message?.documentMessage ? 'documento' : 'texto',
            timestamp: ts
          });
        }
      }
    } catch (e) {
      // silencioso por chat
    }
  }

  return novas;
}

/**
 * Formatar número para o padrão Evolution API
 */
function formatarNumero(numero) {
  let limpo = numero.replace(/\D/g, '');
  if (!limpo.startsWith('55') && limpo.length <= 11) {
    limpo = '55' + limpo;
  }
  return limpo;
}

/**
 * Processar payload do webhook da Evolution API
 */
function processarWebhook(payload) {
  const evento = payload.event;

  if (evento === 'messages.upsert') {
    let msgs = [];
    if (Array.isArray(payload.data)) {
      msgs = payload.data;
    } else if (payload.data?.messages && Array.isArray(payload.data.messages)) {
      msgs = payload.data.messages;
    } else if (payload.data && typeof payload.data === 'object' && payload.data.key) {
      msgs = [payload.data];
    }
    return msgs.map(msg => ({
      tipo: 'mensagem',
      messageId: msg.key?.id,
      numero: msg.key?.remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', ''),
      fromMe: msg.key?.fromMe,
      conteudo: msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption || '[mídia]',
      tipoMensagem: msg.message?.imageMessage ? 'imagem' :
                    msg.message?.audioMessage ? 'audio' :
                    msg.message?.documentMessage ? 'documento' :
                    msg.message?.videoMessage ? 'video' : 'texto',
      timestamp: msg.messageTimestamp
    }));
  }

  if (evento === 'connection.update') {
    return [{
      tipo: 'conexao',
      estado: payload.data?.state,
      qrcode: payload.data?.qrcode?.base64
    }];
  }

  return [];
}

module.exports = {
  criarInstancia,
  obterQRCode,
  verificarConexao,
  enviarMensagem,
  enviarArquivo,
  buscarChats,
  buscarMensagens,
  marcarComoLido,
  configurarWebhook,
  desconectar,
  processarWebhook,
  formatarNumero,
  sincronizarMensagensRecentes
};
