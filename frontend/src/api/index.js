import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor: adicionar token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: tratar erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH
// ============================================================
export const authAPI = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  me: () => api.get('/auth/me'),
  alterarSenha: (senhaAtual, novaSenha) => api.put('/auth/senha', { senhaAtual, novaSenha }),
  listarUsuarios: () => api.get('/auth/usuarios'),
  criarUsuario: (dados) => api.post('/auth/usuarios', dados),
};

// ============================================================
// CLIENTES
// ============================================================
export const clientesAPI = {
  listar: (params) => api.get('/clientes', { params }),
  stats: () => api.get('/clientes/stats'),
  buscarPorId: (id) => api.get(`/clientes/${id}`),
  criar: (dados) => api.post('/clientes', dados),
  atualizar: (id, dados) => api.put(`/clientes/${id}`, dados),
  deletar: (id) => api.delete(`/clientes/${id}`),
  adicionarAnotacao: (id, dados) => api.post(`/clientes/${id}/anotacoes`, dados),
};

// ============================================================
// PROCESSOS
// ============================================================
export const processosAPI = {
  listar: (params) => api.get('/processos', { params }),
  stats: () => api.get('/processos/stats'),
  tribunais: () => api.get('/processos/tribunais'),
  buscarPorId: (id) => api.get(`/processos/${id}`),
  criar: (dados) => api.post('/processos', dados),
  atualizar: (id, dados) => api.put(`/processos/${id}`, dados),
  deletar: (id) => api.delete(`/processos/${id}`),
  consultarDatajud: (id) => api.post(`/processos/${id}/consultar-datajud`),
  movimentacoes: (id) => api.get(`/processos/${id}/movimentacoes`),
  buscarCNJ: (numero_cnj, tribunal_alias) => api.post('/processos/buscar-cnj', { numero_cnj, tribunal_alias }),
  importarPorCpf: (dados) => api.post('/processos/importar-por-cpf', dados),
};

// ============================================================
// PRAZOS / AGENDA
// ============================================================
export const prazosAPI = {
  listar: (params) => api.get('/prazos', { params }),
  proximos: () => api.get('/prazos/proximos'),
  buscarPorId: (id) => api.get(`/prazos/${id}`),
  criar: (dados) => api.post('/prazos', dados),
  atualizar: (id, dados) => api.put(`/prazos/${id}`, dados),
  concluir: (id) => api.put(`/prazos/${id}/concluir`),
  deletar: (id) => api.delete(`/prazos/${id}`),
};

// ============================================================
// RELATÓRIOS
// ============================================================
export const relatoriosAPI = {
  cliente: (id) => api.get(`/relatorios/cliente/${id}`, { responseType: 'blob' }),
  processo: (id) => api.get(`/relatorios/processo/${id}`, { responseType: 'blob' }),
};

// ============================================================
// WHATSAPP
// ============================================================
export const whatsappAPI = {
  status: () => api.get('/whatsapp/status'),
  qrcode: () => api.get('/whatsapp/qrcode'),
  conectar: () => api.post('/whatsapp/conectar'),
  desconectar: () => api.post('/whatsapp/desconectar'),
  conversas: () => api.get('/whatsapp/conversas'),
  mensagens: (id, params) => api.get(`/whatsapp/conversas/${id}/mensagens`, { params }),
  enviarMensagem: (id, conteudo) => api.post(`/whatsapp/conversas/${id}/mensagens`, { conteudo }),
  novaConversa: (dados) => api.post('/whatsapp/nova-conversa', dados),
  vincularCliente: (id, cliente_id) => api.put(`/whatsapp/conversas/${id}/vincular`, { cliente_id }),
  // Instâncias
  instancias: () => api.get('/whatsapp/instancias'),
  criarInstancia: (dados) => api.post('/whatsapp/instancias', dados),
  atualizarInstancia: (id, dados) => api.put(`/whatsapp/instancias/${id}`, dados),
  deletarInstancia: (id) => api.delete(`/whatsapp/instancias/${id}`),
  statusInstancia: (id) => api.get(`/whatsapp/instancias/${id}/status`),
  qrcodeInstancia: (id) => api.get(`/whatsapp/instancias/${id}/qrcode`),
  conectarInstancia: (id) => api.post(`/whatsapp/instancias/${id}/conectar`),
  desconectarInstancia: (id) => api.post(`/whatsapp/instancias/${id}/desconectar`),
};

// ============================================================
// NOTIFICAÇÕES
// ============================================================
export const notificacoesAPI = {
  listar: (params) => api.get('/notificacoes', { params }),
  marcarLida: (id) => api.put(`/notificacoes/${id}/lida`),
  marcarTodasLidas: () => api.put('/notificacoes/marcar-todas-lidas'),
  subscribesPush: (sub) => api.post('/notificacoes/push/subscribe', sub),
  vapidKey: () => api.get('/notificacoes/push/vapid-key'),
  testarPush: () => api.post('/notificacoes/push/testar'),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardAPI = {
  dados: () => api.get('/dashboard'),
};

export default api;
