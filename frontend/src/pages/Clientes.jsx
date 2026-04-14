import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clientesAPI } from '../api';

const AREAS = ['Cível','Trabalhista','Criminal','Família','Previdenciário','Tributário','Empresarial','Imobiliário','Consumidor','Outro'];
const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'prospecto',   label: '⚪ Prospecto' },
  { value: 'qualificado', label: '🔵 Qualificado' },
  { value: 'ativo',       label: '🟢 Ativo' },
  { value: 'encerrado',   label: '🟣 Encerrado' },
  { value: 'perdido',     label: '🔴 Perdido' },
];

function ModalCliente({ cliente, onClose, onSalvar }) {
  const [form, setForm] = useState(cliente || {
    nome: '', tipo: 'pf', cpf_cnpj: '', email: '', telefone: '', celular: '',
    whatsapp: '', endereco: '', cidade: '', estado: '', cep: '',
    area_juridica: '', status_lead: 'prospecto', origem: '', observacoes: ''
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (campo, val) => setForm(prev => ({ ...prev, [campo]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      await onSalvar(form);
      onClose();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-base font-semibold text-white">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div className="flex gap-3">
            {['pf', 'pj'].map(t => (
              <button key={t} type="button"
                onClick={() => set('tipo', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipo === t
                  ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                  : 'bg-navy-900 border-navy-600 text-gray-400 hover:border-navy-500'}`}>
                {t === 'pf' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do cliente" required />
            </div>
            <div>
              <label className="label">{form.tipo === 'pj' ? 'CNPJ' : 'CPF'}</label>
              <input className="input" value={form.cpf_cnpj || ''} onChange={e => set('cpf_cnpj', e.target.value)} placeholder={form.tipo === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone || ''} onChange={e => set('telefone', e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div>
              <label className="label">Celular / WhatsApp</label>
              <input className="input" value={form.celular || ''} onChange={e => set('celular', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">Área Jurídica</label>
              <select className="input" value={form.area_juridica || ''} onChange={e => set('area_juridica', e.target.value)}>
                <option value="">Selecionar...</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status do Lead</label>
              <select className="input" value={form.status_lead} onChange={e => set('status_lead', e.target.value)}>
                {STATUS_OPTS.slice(1).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">CEP</label>
              <input className="input" value={form.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <label className="label">Estado</label>
              <input className="input" value={form.estado || ''} onChange={e => set('estado', e.target.value)} placeholder="SP" maxLength={2} />
            </div>
            <div className="col-span-2">
              <label className="label">Endereço</label>
              <input className="input" value={form.endereco || ''} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, complemento" />
            </div>
            <div>
              <label className="label">Origem do Lead</label>
              <input className="input" value={form.origem || ''} onChange={e => set('origem', e.target.value)} placeholder="Indicação, site, redes sociais..." />
            </div>
            <div className="col-span-2">
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={3} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais sobre o cliente..." />
            </div>
          </div>

          {erro && <p className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
              {salvando ? 'Salvando...' : (cliente ? 'Salvar Alterações' : 'Cadastrar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [modal, setModal] = useState(null); // null | 'novo' | {cliente}
  const [stats, setStats] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento('');
    try {
      const resClientes = await clientesAPI.listar({ busca, status, pagina, limite: 20 });
      setClientes(resClientes.data.dados);
      setTotal(resClientes.data.total);

      try {
        const resStats = await clientesAPI.stats();
        setStats(resStats.data);
      } catch (statsErr) {
        console.error('Erro ao carregar estatisticas de clientes:', statsErr);
      }
    } catch (e) {
      console.error('Erro ao carregar clientes:', e);
      setErroCarregamento(e.response?.data?.erro || 'Erro ao carregar clientes. Tente novamente.');
      setClientes([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [busca, status, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarCliente = async (form) => {
    if (modal?.id) {
      await clientesAPI.atualizar(modal.id, form);
    } else {
      await clientesAPI.criar(form);
    }
    await carregar();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-gray-500">{total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('novo')} className="btn-primary">
          + Novo Cliente
        </button>
      </div>

      {/* Stats rápidas */}
      {stats && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            { label: 'Prospectos', val: stats.prospectos, cor: 'text-gray-400' },
            { label: 'Qualificados', val: stats.qualificados, cor: 'text-blue-400' },
            { label: 'Ativos', val: stats.ativos, cor: 'text-green-400' },
            { label: 'Encerrados', val: stats.encerrados, cor: 'text-purple-400' },
            { label: 'Perdidos', val: stats.perdidos, cor: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="flex-shrink-0 bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className={`text-xl font-bold ${s.cor}`}>{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <input
          className="input flex-1 max-w-xs"
          placeholder="🔍 Buscar por nome, CPF, email..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1); }}
        />
        <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPagina(1); }}>
          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {erroCarregamento && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">
          {erroCarregamento}
        </div>
      )}

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Nome</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">Contato</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden lg:table-cell">Área</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden sm:table-cell">Processos</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">Carregando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">Nenhum cliente encontrado</td></tr>
            ) : clientes.map(c => (
              <tr key={c.id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center text-xs font-bold text-gold-400 flex-shrink-0">
                      {c.nome[0]}
                    </div>
                    <div>
                      <p className="font-medium text-white">{c.nome}</p>
                      <p className="text-xs text-gray-500">{c.cpf_cnpj || (c.tipo === 'pj' ? 'PJ' : 'PF')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-gray-300 text-xs">{c.email || '—'}</p>
                  <p className="text-gray-500 text-xs">{c.celular || c.telefone || '—'}</p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-gray-400">{c.area_juridica || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge badge-${c.status_lead}`}>{c.status_lead}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-gray-400">{c.total_processos || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/clientes/${c.id}`)}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-navy-600 transition-colors text-xs" title="Ver detalhes">
                      👁
                    </button>
                    <button onClick={() => setModal(c)}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-navy-600 transition-colors text-xs" title="Editar">
                      ✏️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
            <span className="text-xs text-gray-500">Mostrando {Math.min((pagina - 1) * 20 + 1, total)}–{Math.min(pagina * 20, total)} de {total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">← Anterior</button>
              <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p + 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalCliente
          cliente={modal === 'novo' ? null : modal}
          onClose={() => setModal(null)}
          onSalvar={salvarCliente}
        />
      )}
    </div>
  );
}
