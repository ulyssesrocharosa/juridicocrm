import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { whatsappAPI, clientesAPI } from '../api';
import { useSocket } from '../hooks/useSocket';


function NovaConversaModal({ onClose, onCriar }) {
  const [numero, setNumero] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');

  useEffect(() => {
    clientesAPI.listar({ limite: 100 }).then(r => setClientes(r.data.dados || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCriar({ numero, cliente_id: clienteId || null, mensagem_inicial: mensagem || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl p-6 max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Nova Conversa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Número do WhatsApp *</label>
            <input className="input" value={numero} onChange={e => setNumero(e.target.value)}
              placeholder="11999999999 (apenas números)" required />
          </div>
          <div>
            <label className="label">Vincular ao cliente</label>
            <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Nenhum (conversa avulsa)</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Mensagem inicial (opcional)</label>
            <textarea className="input resize-none" rows={3} value={mensagem}
              onChange={e => setMensagem(e.target.value)} placeholder="Olá! Aqui é o escritório..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center">Iniciar Conversa</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WhatsApp() {
  const [status, setStatus] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [novaConversaModal, setNovaConversaModal] = useState(false);
  const navigate = useNavigate();
  const [buscaConversa, setBuscaConversa] = useState('');
  const messagesEndRef = useRef(null);
  const { entrarConversa, sairConversa } = useSocket(
    useCallback((data) => {
      if (data.conversa_id === conversaAtiva?.id) {
        setMensagens(prev => [...prev, {
          id: Date.now(),
          conversa_id: data.conversa_id,
          conteudo: data.conteudo,
          remetente: 'cliente',
          enviado_em: new Date().toISOString(),
          lido: 0
        }]);
      }
      carregarConversas();
    }, [conversaAtiva])
  );

  useEffect(() => {
    verificarStatus();
    carregarConversas();
    const interval = setInterval(verificarStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (conversaAtiva) {
      entrarConversa(conversaAtiva.id);
      carregarMensagens(conversaAtiva.id);
      return () => sairConversa(conversaAtiva.id);
    }
  }, [conversaAtiva?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const verificarStatus = async () => {
    try {
      const res = await whatsappAPI.status();
      setStatus(res.data);
    } catch (e) {
      setStatus({ conectado: false, estado: 'error' });
    }
  };

  const carregarConversas = async () => {
    try {
      const res = await whatsappAPI.conversas();
      setConversas(res.data || []);
    } catch (e) {}
  };

  const carregarMensagens = async (id) => {
    try {
      const res = await whatsappAPI.mensagens(id);
      setMensagens(res.data || []);
    } catch (e) {}
  };

  const conectarWhatsApp = () => {
    navigate('/configuracoes', { state: { aba: 'whatsapp' } });
  };

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !conversaAtiva || enviando) return;

    const conteudo = novaMensagem.trim();
    setNovaMensagem('');
    setEnviando(true);

    const msgLocal = {
      id: Date.now(),
      conteudo,
      remetente: 'escritorio',
      enviado_em: new Date().toISOString(),
      status: 'enviada'
    };
    setMensagens(prev => [...prev, msgLocal]);

    try {
      await whatsappAPI.enviarMensagem(conversaAtiva.id, conteudo);
      carregarConversas();
    } catch (e) {
      alert('Erro ao enviar mensagem: ' + e.message);
    } finally {
      setEnviando(false);
    }
  };

  const criarNovaConversa = async (dados) => {
    const res = await whatsappAPI.novaConversa(dados);
    await carregarConversas();
    setConversaAtiva(res.data);
  };

  const conversasFiltradas = conversas.filter(c =>
    !buscaConversa || (c.cliente_nome || c.numero_whatsapp || '').toLowerCase().includes(buscaConversa.toLowerCase())
  );

  const formatarHora = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-full -m-6 animate-fade-in" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Painel lateral: lista de conversas */}
      <div className="w-80 flex-shrink-0 bg-navy-800 border-r border-navy-700 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-navy-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">WhatsApp</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status?.conectado ? 'bg-green-400 pulse-dot' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-500">{status?.conectado ? 'Conectado' : 'Desconectado'}</span>
              {!status?.conectado && (
                <button onClick={conectarWhatsApp} className="text-xs text-gold-400 hover:text-gold-300">Conectar</button>
              )}
            </div>
          </div>
          <input className="input text-xs py-1.5" placeholder="🔍 Buscar conversa..."
            value={buscaConversa} onChange={e => setBuscaConversa(e.target.value)} />
        </div>

        {/* Botão nova conversa */}
        <button onClick={() => setNovaConversaModal(true)} className="mx-3 my-2 btn-secondary text-xs justify-center py-2">
          + Nova Conversa
        </button>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Nenhuma conversa ainda</p>
              <p className="text-gray-600 text-xs mt-1">As mensagens recebidas aparecerão aqui</p>
            </div>
          ) : conversasFiltradas.map(c => (
            <div key={c.id}
              onClick={() => setConversaAtiva(c)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-navy-700/50 ${conversaAtiva?.id === c.id ? 'bg-navy-700' : 'hover:bg-navy-700/50'}`}>
              <div className="w-10 h-10 bg-navy-700 rounded-full flex items-center justify-center text-base flex-shrink-0 font-bold text-gold-400">
                {(c.cliente_nome || c.numero_whatsapp || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white truncate">{c.cliente_nome || c.numero_whatsapp}</p>
                  {c.ultima_mensagem_em && (
                    <span className="text-[10px] text-gray-500 flex-shrink-0 ml-1">{formatarHora(c.ultima_mensagem_em)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.ultima_mensagem || 'Nenhuma mensagem'}</p>
              </div>
              {c.nao_lidas > 0 && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">{c.nao_lidas}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col bg-navy-900">
        {!conversaAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-gray-400 font-medium">Selecione uma conversa</p>
            <p className="text-gray-600 text-sm mt-1">ou inicie uma nova conversa com um cliente</p>
            {!status?.conectado && (
              <button onClick={conectarWhatsApp} className="btn-primary mt-4">
                Conectar WhatsApp
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-navy-700 bg-navy-800">
              <div className="w-9 h-9 bg-navy-700 rounded-full flex items-center justify-center text-sm font-bold text-gold-400">
                {(conversaAtiva.cliente_nome || conversaAtiva.numero_whatsapp || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{conversaAtiva.cliente_nome || 'Contato'}</p>
                <p className="text-xs text-gray-500">{conversaAtiva.numero_whatsapp}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.map((m, i) => {
                const eEscritorio = m.remetente === 'escritorio';
                return (
                  <div key={m.id || i} className={`flex ${eEscritorio ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${eEscritorio
                      ? 'bg-gold-500/20 border border-gold-500/30 text-gray-100 rounded-br-sm'
                      : 'bg-navy-800 border border-navy-700 text-gray-200 rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                      <p className={`text-[10px] mt-1 ${eEscritorio ? 'text-gold-500/60 text-right' : 'text-gray-600'}`}>
                        {formatarHora(m.enviado_em)}
                        {eEscritorio && m.status === 'lida' ? ' ✓✓' : eEscritorio ? ' ✓' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <form onSubmit={enviarMensagem} className="flex gap-3 px-4 py-3 border-t border-navy-700 bg-navy-800">
              <input
                className="input flex-1"
                placeholder={status?.conectado ? "Digite uma mensagem..." : "WhatsApp desconectado"}
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                disabled={!status?.conectado || enviando}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) enviarMensagem(e); }}
              />
              <button type="submit" disabled={!status?.conectado || !novaMensagem.trim() || enviando}
                className="btn-primary flex-shrink-0 px-4 disabled:opacity-40">
                {enviando ? '⏳' : '➤'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Modais */}
      {novaConversaModal && (
        <NovaConversaModal onClose={() => setNovaConversaModal(false)} onCriar={criarNovaConversa} />
      )}
    </div>
  );
}
