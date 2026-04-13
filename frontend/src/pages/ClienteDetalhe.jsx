import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientesAPI, processosAPI } from '../api';

const TIPO_ANOTACAO = { nota: '📝', ligacao: '📞', reuniao: '🤝', email: '📧', tarefa: '✅' };

function TribunalSelect({ value, onChange, tribunais }) {
  return (
    <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Selecionar tribunal...</option>
      {tribunais.map(grupo => (
        <optgroup key={grupo.grupo} label={grupo.grupo}>
          {grupo.tribunais.map(t => (
            <option key={t.codigo} value={t.codigo}>{t.nome}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function ModalProcesso({ clienteId, cpfCliente, onClose, onSalvar, onImportado }) {
  const [form, setForm] = useState({
    numero_cnj: '', tribunal: '', vara: '', comarca: '', classe_processual: '',
    assunto: '', polo_ativo: '', polo_passivo: '', valor_causa: '', observacoes: ''
  });
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [dadosDatajud, setDadosDatajud] = useState(null);
  const [tribunais, setTribunais] = useState([]);
  const [cpfBusca, setCpfBusca] = useState(cpfCliente || '');
  const [tribunalCpf, setTribunalCpf] = useState('');
  const [resultadoImport, setResultadoImport] = useState(null);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    processosAPI.tribunais().then(r => setTribunais(r.data)).catch(() => {});
  }, []);

  const buscarNoCNJ = async () => {
    if (!form.numero_cnj.trim()) return;
    setBuscando(true);
    try {
      const res = await processosAPI.buscarCNJ(form.numero_cnj);
      if (res.data.encontrado) {
        setDadosDatajud(res.data);
        setForm(prev => ({
          ...prev,
          classe_processual: res.data.dados.classe || prev.classe_processual,
          assunto: res.data.dados.assunto || prev.assunto,
          tribunal: res.data.dados.tribunal || prev.tribunal,
          vara: res.data.dados.orgaoJulgador || prev.vara,
          data_distribuicao: res.data.dados.dataDistribuicao || prev.data_distribuicao,
        }));
      } else {
        alert('Processo não encontrado no DataJud para este número CNJ.');
      }
    } catch (e) {
      alert('Não foi possível consultar o DataJud: ' + (e.response?.data?.erro || e.message));
    } finally {
      setBuscando(false);
    }
  };

  const importarPorCpf = async () => {
    if (!cpfBusca.trim()) return;
    setImportando(true);
    setResultadoImport(null);
    try {
      const res = await processosAPI.importarPorCpf({
        documento: cpfBusca,
        cliente_id: clienteId,
        tribunal_alias: tribunalCpf || null,
      });
      setResultadoImport(res.data);
      if (res.data.importados > 0) onImportado?.();
    } catch (e) {
      alert('Erro ao buscar processos: ' + (e.response?.data?.erro || e.message));
    } finally {
      setImportando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSalvar({ ...form, cliente_id: clienteId });
      onClose();
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.erro || err.message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-base font-semibold">Vincular Processo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Seção: Importar por CPF/CNPJ */}
          <div className="bg-navy-700/50 border border-navy-600 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gold-400 uppercase tracking-wide">🔎 Importar pelo CPF/CNPJ</p>
            <p className="text-xs text-gray-500">⚠️ A API pública do DataJud não expõe busca por CPF. Use o número CNJ abaixo para buscar processos individualmente.</p>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" value={cpfBusca} onChange={e => setCpfBusca(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              <button type="button" onClick={importarPorCpf} disabled={importando || !cpfBusca.trim()}
                className="btn-primary whitespace-nowrap flex-shrink-0 text-sm disabled:opacity-40">
                {importando ? '⏳' : '📥 Importar'}
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 flex-shrink-0">Tribunal (opcional):</span>
              <select className="input text-xs py-1 flex-1" value={tribunalCpf} onChange={e => setTribunalCpf(e.target.value)}>
                <option value="">Todos os principais</option>
                {tribunais.map(grupo => (
                  <optgroup key={grupo.grupo} label={grupo.grupo}>
                    {grupo.tribunais.map(t => (
                      <option key={t.codigo} value={t.alias}>{t.codigo}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {resultadoImport && (
              <div className={`rounded-lg p-2.5 text-xs ${
                resultadoImport.importados > 0 ? 'bg-green-900/20 border border-green-700 text-green-300' :
                resultadoImport.suportado === false ? 'bg-yellow-900/20 border border-yellow-700 text-yellow-300' :
                'bg-navy-700 text-gray-400'}`}>
                {resultadoImport.importados > 0
                  ? `✅ ${resultadoImport.importados} de ${resultadoImport.total_encontrados} processo(s) importado(s)!`
                  : resultadoImport.suportado === false
                    ? `⚠️ ${resultadoImport.mensagem}`
                    : resultadoImport.mensagem}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-navy-600" />
            <span className="text-xs text-gray-500">ou adicionar manualmente</span>
            <div className="flex-1 h-px bg-navy-600" />
          </div>

          {/* Formulário manual */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Número CNJ *</label>
              <div className="flex gap-2">
                <input className="input flex-1" value={form.numero_cnj} onChange={e => set('numero_cnj', e.target.value)}
                  placeholder="0000000-00.0000.0.00.0000" required />
                <button type="button" onClick={buscarNoCNJ} disabled={buscando}
                  className="btn-secondary whitespace-nowrap flex-shrink-0">
                  {buscando ? '⏳' : '🔍 CNJ'}
                </button>
              </div>
            </div>

            {dadosDatajud?.encontrado && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-xs text-green-400 font-medium">✅ Processo encontrado no DataJud</p>
                <p className="text-xs text-gray-400 mt-1">{dadosDatajud.dados.classe} • {dadosDatajud.dados.tribunal}</p>
                <p className="text-xs text-gray-400">{dadosDatajud.totalMovimentacoes} movimentações encontradas</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tribunal</label>
                <TribunalSelect value={form.tribunal} onChange={v => set('tribunal', v)} tribunais={tribunais} />
              </div>
              <div><label className="label">Vara / Juízo</label>
                <input className="input" value={form.vara || ''} onChange={e => set('vara', e.target.value)} /></div>
              <div><label className="label">Comarca</label>
                <input className="input" value={form.comarca || ''} onChange={e => set('comarca', e.target.value)} /></div>
              <div><label className="label">Classe Processual</label>
                <input className="input" value={form.classe_processual || ''} onChange={e => set('classe_processual', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Assunto</label>
                <input className="input" value={form.assunto || ''} onChange={e => set('assunto', e.target.value)} /></div>
              <div><label className="label">Polo Ativo</label>
                <input className="input" value={form.polo_ativo || ''} onChange={e => set('polo_ativo', e.target.value)} /></div>
              <div><label className="label">Polo Passivo</label>
                <input className="input" value={form.polo_passivo || ''} onChange={e => set('polo_passivo', e.target.value)} /></div>
              <div><label className="label">Valor da Causa</label>
                <input className="input" value={form.valor_causa || ''} onChange={e => set('valor_causa', e.target.value)} placeholder="R$ 0,00" /></div>
              <div className="col-span-2"><label className="label">Observações</label>
                <textarea className="input resize-none" rows={2} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} /></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : 'Vincular Processo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('processos');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [tipoAnotacao, setTipoAnotacao] = useState('nota');
  const [modalProcesso, setModalProcesso] = useState(false);

  useEffect(() => {
    carregar();
  }, [id]);

  const carregar = async () => {
    try {
      const res = await clientesAPI.buscarPorId(id);
      setCliente(res.data);
    } catch (e) {
      navigate('/clientes');
    } finally {
      setCarregando(false);
    }
  };

  const salvarAnotacao = async () => {
    if (!novaAnotacao.trim()) return;
    await clientesAPI.adicionarAnotacao(id, { tipo: tipoAnotacao, descricao: novaAnotacao });
    setNovaAnotacao('');
    await carregar();
  };

  const adicionarProcesso = async (dados) => {
    await processosAPI.criar(dados);
    await carregar();
  };

  if (carregando) return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  if (!cliente) return null;

  const ABAS = [
    { id: 'processos', label: `⚖️ Processos (${cliente.processos?.length || 0})` },
    { id: 'timeline',  label: `📝 Timeline (${cliente.anotacoes?.length || 0})` },
    { id: 'dados',     label: '📋 Dados Cadastrais' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clientes')} className="text-gray-500 hover:text-gray-300 transition-colors">
          ← Voltar
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center text-xl font-bold text-gold-400">
            {cliente.nome[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{cliente.nome}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`badge badge-${cliente.status_lead}`}>{cliente.status_lead}</span>
              {cliente.area_juridica && <span className="text-xs text-gray-500">{cliente.area_juridica}</span>}
              {cliente.tipo === 'pj' && <span className="badge bg-navy-700 text-gray-400">PJ</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {cliente.celular && (
            <a href={`https://wa.me/55${cliente.celular.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs">💬 WhatsApp</a>
          )}
          <a href={`/api/relatorios/cliente/${id}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs">📄 PDF</a>
          <button onClick={() => navigate('/clientes', { state: { editar: cliente } })}
            className="btn-secondary text-xs">✏️ Editar</button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'E-mail', val: cliente.email, icon: '📧' },
          { label: 'Celular', val: cliente.celular || cliente.telefone, icon: '📱' },
          { label: 'CPF/CNPJ', val: cliente.cpf_cnpj, icon: '🪪' },
          { label: 'Cidade', val: cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : null, icon: '📍' },
        ].map(c => (
          <div key={c.label} className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">{c.icon} {c.label}</p>
            <p className="text-sm font-medium text-white mt-1 truncate">{c.val || '—'}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-navy-700 pb-0">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${abaAtiva === a.id
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Aba: Processos */}
      {abaAtiva === 'processos' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">{cliente.processos?.length || 0} processo(s) vinculado(s)</p>
            <button onClick={() => setModalProcesso(true)} className="btn-primary text-xs">+ Vincular Processo</button>
          </div>
          {(cliente.processos || []).length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 text-sm">Nenhum processo vinculado</p>
              <button onClick={() => setModalProcesso(true)} className="btn-primary mx-auto mt-3 text-xs">
                Vincular primeiro processo
              </button>
            </div>
          ) : (cliente.processos || []).map(p => (
            <div key={p.id}
              className="card cursor-pointer hover:border-navy-500 transition-colors"
              onClick={() => navigate(`/processos/${p.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-mono font-semibold text-gold-400">{p.numero_cnj}</p>
                  <p className="text-sm text-gray-300 mt-1">{p.classe_processual || 'Classe não informada'}</p>
                  {p.assunto && <p className="text-xs text-gray-500 mt-0.5">{p.assunto}</p>}
                  {p.vara && <p className="text-xs text-gray-500">{p.vara} {p.comarca && `• ${p.comarca}`}</p>}
                </div>
                <div className="text-right">
                  <span className={`badge ${p.status === 'em_andamento' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                  {p.ultima_movimentacao && (
                    <p className="text-xs text-gray-500 mt-2 max-w-[150px] text-right">{p.ultima_movimentacao.slice(0, 60)}...</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba: Timeline */}
      {abaAtiva === 'timeline' && (
        <div className="space-y-4">
          {/* Nova anotação */}
          <div className="card">
            <div className="flex gap-2 mb-3">
              {Object.entries(TIPO_ANOTACAO).map(([k, v]) => (
                <button key={k} onClick={() => setTipoAnotacao(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tipoAnotacao === k
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50'
                    : 'bg-navy-700 text-gray-400 hover:text-gray-200'}`}>
                  {v} {k}
                </button>
              ))}
            </div>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Adicionar anotação, ligação, reunião..."
              value={novaAnotacao}
              onChange={e => setNovaAnotacao(e.target.value)}
            />
            <button onClick={salvarAnotacao} disabled={!novaAnotacao.trim()} className="btn-primary mt-2 text-xs">
              Salvar anotação
            </button>
          </div>

          {/* Lista de anotações */}
          {(cliente.anotacoes || []).map(a => (
            <div key={a.id} className="flex gap-3">
              <div className="w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                {TIPO_ANOTACAO[a.tipo] || '📝'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-300">{a.usuario_nome}</span>
                  <span className="text-xs text-gray-600">{new Date(a.criado_em).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-gray-300 mt-1">{a.descricao}</p>
              </div>
            </div>
          ))}

          {(cliente.anotacoes || []).length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">Nenhuma anotação ainda</p>
          )}
        </div>
      )}

      {/* Aba: Dados Cadastrais */}
      {abaAtiva === 'dados' && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Nome', cliente.nome],
              ['Tipo', cliente.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'],
              ['CPF/CNPJ', cliente.cpf_cnpj],
              ['E-mail', cliente.email],
              ['Telefone', cliente.telefone],
              ['Celular', cliente.celular],
              ['WhatsApp', cliente.whatsapp],
              ['Área Jurídica', cliente.area_juridica],
              ['Origem', cliente.origem],
              ['Status', cliente.status_lead],
              ['Endereço', cliente.endereco],
              ['Cidade/Estado', cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : null],
              ['CEP', cliente.cep],
              ['Observações', cliente.observacoes],
              ['Cadastrado em', new Date(cliente.criado_em).toLocaleDateString('pt-BR')],
              ['Responsável', cliente.responsavel_nome],
            ].map(([l, v]) => v ? (
              <div key={l}>
                <p className="text-xs text-gray-500">{l}</p>
                <p className="text-gray-200 mt-0.5">{v}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {modalProcesso && (
        <ModalProcesso
          clienteId={id}
          cpfCliente={cliente.cpf_cnpj}
          onClose={() => setModalProcesso(false)}
          onSalvar={adicionarProcesso}
          onImportado={carregar}
        />
      )}
    </div>
  );
}
