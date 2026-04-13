import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { prazosAPI, processosAPI, clientesAPI } from '../api';

const TIPO_ICONE = { prazo: '⚖️', audiencia: '🏛️', reuniao: '🤝', diligencia: '📋', tarefa: '✅' };
const TIPO_COR = {
  prazo:      'bg-red-900/30 text-red-300 border-red-800',
  audiencia:  'bg-blue-900/30 text-blue-300 border-blue-800',
  reuniao:    'bg-green-900/30 text-green-300 border-green-800',
  diligencia: 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
  tarefa:     'bg-gray-700 text-gray-300 border-gray-600',
};
const PRIORIDADE_COR = {
  baixa:   'bg-gray-700 text-gray-400',
  normal:  'bg-navy-700 text-gray-300',
  alta:    'bg-orange-900/40 text-orange-300',
  urgente: 'bg-red-900/40 text-red-300',
};

function diasRestantes(dataStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(dataStr + 'T00:00:00');
  const diff = Math.round((data - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { texto: `${Math.abs(diff)}d atraso`, cor: 'text-red-400' };
  if (diff === 0) return { texto: 'Hoje', cor: 'text-yellow-400 font-bold' };
  if (diff === 1) return { texto: 'Amanhã', cor: 'text-orange-400' };
  if (diff <= 7) return { texto: `${diff} dias`, cor: 'text-yellow-400' };
  return { texto: `${diff} dias`, cor: 'text-gray-400' };
}

function ModalPrazo({ prazo, onClose, onSalvar }) {
  const [form, setForm] = useState({
    titulo: prazo?.titulo || '',
    descricao: prazo?.descricao || '',
    tipo: prazo?.tipo || 'prazo',
    data_vencimento: prazo?.data_vencimento || '',
    hora: prazo?.hora || '',
    prioridade: prazo?.prioridade || 'normal',
    processo_id: prazo?.processo_id || '',
    cliente_id: prazo?.cliente_id || '',
    status: prazo?.status || 'pendente',
  });
  const [processos, setProcessos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    Promise.all([
      processosAPI.listar({ limite: 100 }),
      clientesAPI.listar({ limite: 100 }),
    ]).then(([rp, rc]) => {
      setProcessos(rp.data.dados || []);
      setClientes(rc.data.dados || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSalvar(form);
      onClose();
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.erro || err.message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-base font-semibold">{prazo ? 'Editar Prazo' : 'Novo Prazo'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Título *</label>
            <input className="input" value={form.titulo} onChange={e => set('titulo', e.target.value)} required
              placeholder="Ex: Prazo contestação, Audiência instrução..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {Object.entries(TIPO_ICONE).map(([k, v]) => (
                  <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioridade</label>
              <select className="input" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
                <option value="baixa">⬇️ Baixa</option>
                <option value="normal">➡️ Normal</option>
                <option value="alta">⬆️ Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
            </div>
            <div>
              <label className="label">Data de Vencimento *</label>
              <input type="date" className="input" value={form.data_vencimento}
                onChange={e => set('data_vencimento', e.target.value)} required />
            </div>
            <div>
              <label className="label">Horário (opcional)</label>
              <input type="time" className="input" value={form.hora}
                onChange={e => set('hora', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Cliente (opcional)</label>
            <select className="input" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Nenhum</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Processo (opcional)</label>
            <select className="input" value={form.processo_id} onChange={e => set('processo_id', e.target.value)}>
              <option value="">Nenhum</option>
              {processos.map(p => <option key={p.id} value={p.id}>{p.numero_cnj} — {p.cliente_nome}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea className="input resize-none" rows={2} value={form.descricao}
              onChange={e => set('descricao', e.target.value)} placeholder="Detalhes sobre o prazo..." />
          </div>

          {prazo && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
              {salvando ? 'Salvando...' : 'Salvar Prazo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Agenda() {
  const navigate = useNavigate();
  const [prazos, setPrazos] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFiltro, setStatusFiltro] = useState('pendente');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (statusFiltro) params.status = statusFiltro;
      if (tipoFiltro) params.tipo = tipoFiltro;
      const res = await prazosAPI.listar(params);
      setPrazos(res.data.dados || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [statusFiltro, tipoFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarPrazo = async (dados) => {
    if (editando) {
      await prazosAPI.atualizar(editando.id, dados);
    } else {
      await prazosAPI.criar(dados);
    }
    setEditando(null);
    await carregar();
  };

  const concluir = async (id) => {
    await prazosAPI.concluir(id);
    await carregar();
  };

  const deletar = async (id) => {
    if (!confirm('Remover este prazo?')) return;
    await prazosAPI.deletar(id);
    await carregar();
  };

  const abrirEditar = (prazo) => {
    setEditando(prazo);
    setModal(true);
  };

  const fecharModal = () => {
    setModal(false);
    setEditando(null);
  };

  // Agrupar por data
  const grupos = prazos.reduce((acc, p) => {
    const data = p.data_vencimento;
    if (!acc[data]) acc[data] = [];
    acc[data].push(p);
    return acc;
  }, {});

  const formatarData = (dataStr) => {
    const d = new Date(dataStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Agenda de Prazos</h1>
          <p className="text-sm text-gray-500">{total} prazo(s) encontrado(s)</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Novo Prazo</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select className="input w-44" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select className="input w-44" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_ICONE).map(([k, v]) => (
            <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Lista agrupada por data */}
      {carregando ? (
        <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>
      ) : prazos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-400 font-medium">Nenhum prazo encontrado</p>
          <p className="text-gray-600 text-sm mt-1">Adicione prazos para controlar seus compromissos</p>
          <button onClick={() => setModal(true)} className="btn-primary mx-auto mt-4 text-sm">+ Novo Prazo</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([data, items]) => {
            const { texto: labelDias, cor: corDias } = diasRestantes(data);
            return (
              <div key={data}>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-gray-300 capitalize">{formatarData(data)}</h3>
                  <span className={`text-xs font-medium ${corDias}`}>{labelDias}</span>
                </div>
                <div className="space-y-2">
                  {items.map(prazo => (
                    <div key={prazo.id}
                      className={`card flex items-start gap-3 ${prazo.status === 'concluido' ? 'opacity-50' : ''}`}>
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base border ${TIPO_COR[prazo.tipo] || 'bg-gray-700'}`}>
                        {TIPO_ICONE[prazo.tipo] || '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium text-white ${prazo.status === 'concluido' ? 'line-through text-gray-500' : ''}`}>
                            {prazo.titulo}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORIDADE_COR[prazo.prioridade]}`}>
                            {prazo.prioridade}
                          </span>
                          {prazo.hora && <span className="text-xs text-gray-500">🕐 {prazo.hora}</span>}
                        </div>
                        {prazo.descricao && <p className="text-xs text-gray-500 mt-0.5 truncate">{prazo.descricao}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          {prazo.cliente_nome && (
                            <span className="text-xs text-gray-500">👤 {prazo.cliente_nome}</span>
                          )}
                          {prazo.processo_cnj && (
                            <span className="text-xs text-gray-500 font-mono cursor-pointer hover:text-gold-400"
                              onClick={() => navigate(`/processos/${prazo.processo_id}`)}>
                              ⚖️ {prazo.processo_cnj}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {prazo.status === 'pendente' && (
                          <button onClick={() => concluir(prazo.id)}
                            className="text-green-500 hover:text-green-400 text-sm p-1.5 rounded hover:bg-green-900/20 transition-colors"
                            title="Marcar como concluído">✓</button>
                        )}
                        <button onClick={() => abrirEditar(prazo)}
                          className="text-gray-500 hover:text-gray-300 text-xs p-1.5 rounded hover:bg-navy-700 transition-colors"
                          title="Editar">✏️</button>
                        <button onClick={() => deletar(prazo.id)}
                          className="text-gray-600 hover:text-red-400 text-xs p-1.5 rounded hover:bg-red-900/20 transition-colors"
                          title="Remover">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ModalPrazo
          prazo={editando}
          onClose={fecharModal}
          onSalvar={salvarPrazo}
        />
      )}
    </div>
  );
}
