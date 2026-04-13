import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processosAPI } from '../api';

function TribunalBadge({ tribunal }) {
  if (!tribunal) return null;
  const cor = tribunal.startsWith('TJ') ? 'bg-blue-900/40 text-blue-300' :
              tribunal.startsWith('TRT') ? 'bg-orange-900/40 text-orange-300' :
              tribunal.startsWith('TRF') ? 'bg-purple-900/40 text-purple-300' :
              'bg-gray-700 text-gray-400';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cor}`}>{tribunal}</span>;
}

function ProcessoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [processo, setProcesso] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [consultando, setConsultando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, [id]);

  const carregar = async () => {
    try {
      const res = await processosAPI.buscarPorId(id);
      setProcesso(res.data);
      setMovimentacoes(res.data.movimentacoes || []);
    } catch (e) {
      navigate('/processos');
    } finally {
      setCarregando(false);
    }
  };

  const consultarDatajud = async () => {
    setConsultando(true);
    try {
      const res = await processosAPI.consultarDatajud(id);
      await carregar();
      if (res.data.novasMovimentacoes > 0) {
        alert(`✅ ${res.data.novasMovimentacoes} nova(s) movimentação(ões) encontrada(s)!`);
      } else {
        alert('✅ Consulta concluída. Nenhuma novidade encontrada.');
      }
    } catch (e) {
      alert('Erro ao consultar DataJud: ' + (e.response?.data?.erro || e.message));
    } finally {
      setConsultando(false);
    }
  };

  if (carregando) return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  if (!processo) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/processos')} className="text-gray-500 hover:text-gray-300">← Voltar</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white font-mono">{processo.numero_cnj}</h1>
          <p className="text-sm text-gray-400">{processo.classe_processual || 'Classe não informada'}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/relatorios/processo/${id}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs">📄 PDF</a>
          <button onClick={consultarDatajud} disabled={consultando} className="btn-primary text-xs">
            {consultando ? '⏳ Consultando...' : '🔄 Atualizar via DataJud'}
          </button>
        </div>
      </div>

      {/* Info do processo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cliente', val: processo.cliente_nome, icon: '👤' },
          { label: 'Tribunal', val: processo.tribunal, icon: '🏛️' },
          { label: 'Vara/Juízo', val: processo.vara, icon: '⚖️' },
          { label: 'Status', val: processo.status?.replace('_', ' '), icon: '📊' },
          { label: 'Polo Ativo', val: processo.polo_ativo, icon: '📋' },
          { label: 'Polo Passivo', val: processo.polo_passivo, icon: '📋' },
          { label: 'Valor da Causa', val: processo.valor_causa, icon: '💰' },
          { label: 'Última Consulta', val: processo.ultima_consulta_datajud ? new Date(processo.ultima_consulta_datajud).toLocaleString('pt-BR') : 'Nunca', icon: '🕐' },
        ].filter(c => c.val).map(c => (
          <div key={c.label} className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">{c.icon} {c.label}</p>
            <p className="text-sm font-medium text-white mt-1">{c.val}</p>
          </div>
        ))}
      </div>

      {/* Movimentações */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          📋 Movimentações ({movimentacoes.length})
        </h2>
        {movimentacoes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Nenhuma movimentação registrada</p>
            <button onClick={consultarDatajud} disabled={consultando} className="btn-primary mx-auto mt-3 text-xs">
              Consultar DataJud
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((m, i) => (
              <div key={m.id || i} className={`flex gap-4 ${m.nova ? 'bg-gold-500/5 border-l-2 border-gold-500 pl-3 rounded-r-lg' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${m.nova ? 'bg-gold-500' : 'bg-navy-600'}`} />
                  {i < movimentacoes.length - 1 && <div className="w-px flex-1 bg-navy-700 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    {m.nova && <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[10px]">NOVA</span>}
                    <span className="text-xs text-gray-500">
                      {m.data_movimentacao ? new Date(m.data_movimentacao).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 mt-0.5">{m.descricao}</p>
                  {m.complemento && <p className="text-xs text-gray-500 mt-0.5">{m.complemento}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      {processo.observacoes && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">📝 Observações</h2>
          <p className="text-sm text-gray-400">{processo.observacoes}</p>
        </div>
      )}
    </div>
  );
}

function ListaProcessos() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [tribunal, setTribunal] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [stats, setStats] = useState(null);
  const [tribunais, setTribunais] = useState([]);

  useEffect(() => {
    processosAPI.tribunais().then(r => setTribunais(r.data)).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resP, resS] = await Promise.all([
        processosAPI.listar({ busca, status, tribunal, pagina, limite: 20 }),
        processosAPI.stats()
      ]);
      setProcessos(resP.data.dados);
      setTotal(resP.data.total);
      setStats(resS.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [busca, status, tribunal, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Processos</h1>
          <p className="text-sm text-gray-500">{total} processo(s) cadastrado(s)</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            { label: 'Total', val: stats.total, cor: 'text-white' },
            { label: 'Em Andamento', val: stats.em_andamento, cor: 'text-green-400' },
            { label: 'Suspensos', val: stats.suspensos, cor: 'text-yellow-400' },
            { label: 'Encerrados', val: stats.encerrados, cor: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="flex-shrink-0 bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className={`text-xl font-bold ${s.cor}`}>{s.val || 0}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-[180px]" placeholder="🔍 Buscar por número CNJ, cliente..."
          value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
        <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPagina(1); }}>
          <option value="">Todos os status</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="suspenso">Suspenso</option>
          <option value="encerrado">Encerrado</option>
          <option value="arquivado">Arquivado</option>
        </select>
        <select className="input w-52" value={tribunal} onChange={e => { setTribunal(e.target.value); setPagina(1); }}>
          <option value="">Todos os tribunais</option>
          {tribunais.map(grupo => (
            <optgroup key={grupo.grupo} label={grupo.grupo}>
              {grupo.tribunais.map(t => (
                <option key={t.codigo} value={t.codigo}>{t.codigo}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {carregando ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>
        ) : processos.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-gray-500 text-sm">Nenhum processo encontrado</p>
            <p className="text-gray-600 text-xs mt-2">Vincule processos através do cadastro do cliente</p>
          </div>
        ) : processos.map(p => (
          <div key={p.id} className="card cursor-pointer hover:border-navy-500 transition-all"
            onClick={() => navigate(`/processos/${p.id}`)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-bold text-gold-400">{p.numero_cnj}</span>
                  <span className={`badge ${p.status === 'em_andamento' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                  {p.ultima_consulta_datajud && (
                    <span className="text-[10px] text-gray-600">
                      Atualizado {new Date(p.ultima_consulta_datajud).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white mt-1">{p.classe_processual || 'Classe não informada'}</p>
                {p.assunto && <p className="text-xs text-gray-500">{p.assunto}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-gray-500">👤</span>
                  <span className="text-xs text-gray-300">{p.cliente_nome}</span>
                </div>
                {p.tribunal && <div className="mt-1 flex justify-end"><TribunalBadge tribunal={p.tribunal} /></div>}
              </div>
            </div>
            {p.ultima_movimentacao && (
              <p className="text-xs text-gray-500 mt-2 border-t border-navy-700 pt-2 truncate">
                📋 {p.ultima_movimentacao}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Paginação */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-gray-500 flex items-center px-3">Página {pagina}</span>
          <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Próxima →</button>
        </div>
      )}
    </div>
  );
}

export default function Processos() {
  const { id } = useParams();
  return id ? <ProcessoDetalhe /> : <ListaProcessos />;
}
