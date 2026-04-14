import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI, notificacoesAPI, whatsappAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

const INSTANCIA_VAZIA = { nome: '', evolution_url: '', evolution_key: '', instance_name: '' };

export default function Configuracoes() {
  const { usuario } = useAuth();
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState(location.state?.aba || 'conta');
  const [usuarios, setUsuarios] = useState([]);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'advogado' });
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  // WhatsApp — instâncias
  const [instancias, setInstancias] = useState([]);
  const [statusInstancias, setStatusInstancias] = useState({});
  const [modalInstancia, setModalInstancia] = useState(null); // null | 'nova' | objeto (editar)
  const [formInstancia, setFormInstancia] = useState(INSTANCIA_VAZIA);
  const [salvandoInstancia, setSalvandoInstancia] = useState(false);
  const [modalQR, setModalQR] = useState(null); // null | { id, qrcode, nome }
  const [carregandoQR, setCarregandoQR] = useState(false);
  const poolingRef = useRef({});

  useEffect(() => {
    if (abaAtiva === 'usuarios') carregarUsuarios();
    if (abaAtiva === 'whatsapp') carregarInstancias();
  }, [abaAtiva]);

  const carregarUsuarios = async () => {
    try { const r = await authAPI.listarUsuarios(); setUsuarios(r.data); } catch(e){}
  };

  const carregarInstancias = async () => {
    try {
      const r = await whatsappAPI.instancias();
      setInstancias(r.data);
      r.data.forEach(i => verificarStatusInstancia(i.id));
    } catch(e){}
  };

  const verificarStatusInstancia = async (id) => {
    try {
      const r = await whatsappAPI.statusInstancia(id);
      setStatusInstancias(prev => ({ ...prev, [id]: r.data }));
    } catch(e) {
      setStatusInstancias(prev => ({ ...prev, [id]: { conectado: false, estado: 'error' } }));
    }
  };

  const mostrar = (m, e = false) => {
    if (e) { setErro(m); setMsg(''); } else { setMsg(m); setErro(''); }
    setTimeout(() => { setMsg(''); setErro(''); }, 4000);
  };

  const alterarSenha = async (e) => {
    e.preventDefault();
    if (senhaForm.novaSenha !== senhaForm.confirmar) { mostrar('As senhas não coincidem', true); return; }
    if (senhaForm.novaSenha.length < 6) { mostrar('A nova senha deve ter pelo menos 6 caracteres', true); return; }
    setSalvandoSenha(true);
    try {
      await authAPI.alterarSenha(senhaForm.senhaAtual, senhaForm.novaSenha);
      mostrar('Senha alterada com sucesso!');
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch(err) {
      mostrar(err.response?.data?.erro || 'Erro ao alterar senha', true);
    } finally { setSalvandoSenha(false); }
  };

  const criarUsuario = async (e) => {
    e.preventDefault();
    setSalvandoUsuario(true);
    try {
      await authAPI.criarUsuario(novoUsuario);
      mostrar('Usuário criado com sucesso!');
      setNovoUsuario({ nome: '', email: '', senha: '', perfil: 'advogado' });
      carregarUsuarios();
    } catch(err) {
      mostrar(err.response?.data?.erro || 'Erro ao criar usuário', true);
    } finally { setSalvandoUsuario(false); }
  };

  const testarPush = async () => {
    try {
      await notificacoesAPI.testarPush();
      mostrar('Notificação de teste enviada!');
    } catch(err) {
      mostrar(err.response?.data?.erro || 'Ative as notificações no navegador primeiro', true);
    }
  };

  const abrirModalNova = () => {
    setFormInstancia(INSTANCIA_VAZIA);
    setModalInstancia('nova');
  };

  const abrirModalEditar = (instancia) => {
    setFormInstancia({ ...instancia });
    setModalInstancia(instancia);
  };

  const salvarInstancia = async (e) => {
    e.preventDefault();
    setSalvandoInstancia(true);
    try {
      if (modalInstancia === 'nova') {
        await whatsappAPI.criarInstancia(formInstancia);
        mostrar('Instância criada com sucesso!');
      } else {
        await whatsappAPI.atualizarInstancia(modalInstancia.id, formInstancia);
        mostrar('Instância atualizada!');
      }
      setModalInstancia(null);
      carregarInstancias();
    } catch(err) {
      mostrar(err.response?.data?.erro || 'Erro ao salvar instância', true);
    } finally { setSalvandoInstancia(false); }
  };

  const deletarInstancia = async (id, nome) => {
    if (!confirm(`Remover a instância "${nome}"?`)) return;
    try {
      await whatsappAPI.deletarInstancia(id);
      mostrar('Instância removida');
      carregarInstancias();
    } catch(err) {
      mostrar('Erro ao remover instância', true);
    }
  };

  const conectarInstancia = async (instancia) => {
    setCarregandoQR(true);
    setModalQR({ id: instancia.id, nome: instancia.nome, qrcode: null });
    try {
      const r = await whatsappAPI.conectarInstancia(instancia.id);
      setModalQR({ id: instancia.id, nome: instancia.nome, qrcode: r.data.qrcode });
      // Polling de status até conectar
      const interval = setInterval(async () => {
        const s = await whatsappAPI.statusInstancia(instancia.id);
        setStatusInstancias(prev => ({ ...prev, [instancia.id]: s.data }));
        if (s.data.conectado) {
          clearInterval(interval);
          setModalQR(null);
          mostrar(`${instancia.nome} conectado!`);
        }
      }, 3000);
      poolingRef.current[instancia.id] = interval;
    } catch(err) {
      setModalQR(null);
      mostrar(err.response?.data?.erro || 'Erro ao conectar. Verifique a URL e a chave da Evolution API.', true);
    } finally { setCarregandoQR(false); }
  };

  const desconectarInstancia = async (instancia) => {
    if (!confirm(`Desconectar "${instancia.nome}"?`)) return;
    try {
      await whatsappAPI.desconectarInstancia(instancia.id);
      verificarStatusInstancia(instancia.id);
      mostrar(`${instancia.nome} desconectado`);
    } catch(err) {
      mostrar('Erro ao desconectar', true);
    }
  };

  const fecharModalQR = (id) => {
    if (poolingRef.current[id]) {
      clearInterval(poolingRef.current[id]);
      delete poolingRef.current[id];
    }
    setModalQR(null);
  };

  const ABAS = [
    { id: 'conta', label: '👤 Minha Conta' },
    { id: 'usuarios', label: '👥 Usuários', admin: true },
    { id: 'whatsapp', label: '💬 WhatsApp' },
    { id: 'notificacoes', label: '🔔 Notificações' },
    { id: 'sistema', label: '⚙️ Sistema' },
  ];

  const perfisLabel = { admin: 'Administrador', advogado: 'Advogado', assistente: 'Assistente' };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <h1 className="text-xl font-bold text-white">Configurações</h1>

      {/* Mensagem de feedback */}
      {msg && <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-2.5 text-green-400 text-sm">{msg}</div>}
      {erro && <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">{erro}</div>}

      {/* Abas */}
      <div className="flex gap-1 border-b border-navy-700">
        {ABAS.filter(a => !a.admin || usuario?.perfil === 'admin').map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${abaAtiva === a.id
              ? 'border-gold-500 text-gold-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Minha Conta */}
      {abaAtiva === 'conta' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Informações da Conta</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gold-500 rounded-2xl flex items-center justify-center text-navy-900 font-bold text-xl">
                {usuario?.nome?.[0]}
              </div>
              <div>
                <p className="font-semibold text-white">{usuario?.nome}</p>
                <p className="text-sm text-gray-400">{usuario?.email}</p>
                <span className="badge bg-navy-700 text-gray-300 mt-1">{perfisLabel[usuario?.perfil]}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Alterar Senha</h2>
            <form onSubmit={alterarSenha} className="space-y-3">
              <div>
                <label className="label">Senha Atual</label>
                <input type="password" className="input" value={senhaForm.senhaAtual}
                  onChange={e => setSenhaForm(p => ({ ...p, senhaAtual: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Nova Senha</label>
                <input type="password" className="input" value={senhaForm.novaSenha}
                  onChange={e => setSenhaForm(p => ({ ...p, novaSenha: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <label className="label">Confirmar Nova Senha</label>
                <input type="password" className="input" value={senhaForm.confirmar}
                  onChange={e => setSenhaForm(p => ({ ...p, confirmar: e.target.value }))} required />
              </div>
              <button type="submit" disabled={salvandoSenha} className="btn-primary">
                {salvandoSenha ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Usuários (admin) */}
      {abaAtiva === 'usuarios' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Usuários do Sistema</h2>
            <div className="space-y-2">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-navy-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-navy-600 rounded-full flex items-center justify-center text-xs font-bold text-gold-400">
                      {u.nome[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.nome}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-navy-600 text-gray-300">{perfisLabel[u.perfil]}</span>
                    {!u.ativo && <span className="badge bg-red-900 text-red-400">Inativo</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Adicionar Usuário</h2>
            <form onSubmit={criarUsuario} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome *</label>
                  <input className="input" value={novoUsuario.nome}
                    onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">E-mail *</label>
                  <input type="email" className="input" value={novoUsuario.email}
                    onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Senha *</label>
                  <input type="password" className="input" value={novoUsuario.senha}
                    onChange={e => setNovoUsuario(p => ({ ...p, senha: e.target.value }))} required minLength={6} />
                </div>
                <div>
                  <label className="label">Perfil</label>
                  <select className="input" value={novoUsuario.perfil}
                    onChange={e => setNovoUsuario(p => ({ ...p, perfil: e.target.value }))}>
                    <option value="advogado">Advogado</option>
                    <option value="assistente">Assistente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={salvandoUsuario} className="btn-primary">
                {salvandoUsuario ? 'Criando...' : 'Criar Usuário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp */}
      {abaAtiva === 'whatsapp' && (
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Instâncias WhatsApp</h2>
              <p className="text-xs text-gray-500 mt-0.5">Gerencie as conexões com a Evolution API</p>
            </div>
            <button onClick={abrirModalNova} className="btn-primary text-xs">
              + Nova Instância
            </button>
          </div>

          {/* Lista de instâncias */}
          {instancias.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-4xl mb-3">📱</p>
              <p className="text-sm font-medium text-white mb-1">Nenhuma instância configurada</p>
              <p className="text-xs text-gray-500 mb-4">Adicione uma instância para conectar o WhatsApp ao sistema</p>
              <button onClick={abrirModalNova} className="btn-primary text-xs">+ Adicionar Instância</button>
            </div>
          ) : (
            <div className="space-y-3">
              {instancias.map(inst => {
                const status = statusInstancias[inst.id];
                const conectado = status?.conectado;
                return (
                  <div key={inst.id} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conectado ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{inst.nome}</p>
                          <p className="text-xs text-gray-500 truncate">Instância: {inst.instance_name}</p>
                          <p className="text-xs text-gray-600 truncate">{inst.evolution_url}</p>
                          {conectado && status?.numero && (
                            <p className="text-xs text-green-400 mt-0.5">📞 {status.numero}</p>
                          )}
                          {!conectado && (
                            <span className="inline-block text-xs text-red-400 mt-0.5">Desconectado</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => verificarStatusInstancia(inst.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-navy-700 transition-colors"
                          title="Atualizar status"
                        >🔄</button>
                        {!conectado ? (
                          <button
                            onClick={() => conectarInstancia(inst)}
                            className="btn-primary text-xs px-3 py-1.5"
                          >Conectar</button>
                        ) : (
                          <button
                            onClick={() => desconectarInstancia(inst)}
                            className="btn-danger text-xs px-3 py-1.5"
                          >Desconectar</button>
                        )}
                        <button
                          onClick={() => abrirModalEditar(inst)}
                          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-navy-700 transition-colors"
                          title="Editar"
                        >✏️</button>
                        <button
                          onClick={() => deletarInstancia(inst.id, inst.nome)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-navy-700 transition-colors"
                          title="Remover"
                        >🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão recarregar */}
          {instancias.length > 0 && (
            <button onClick={carregarInstancias} className="btn-secondary text-xs w-full">
              🔄 Atualizar todas
            </button>
          )}
        </div>
      )}

      {/* Modal — Nova/Editar Instância */}
      {modalInstancia !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-semibold text-white">
              {modalInstancia === 'nova' ? '+ Nova Instância' : `Editar — ${modalInstancia.nome}`}
            </h2>
            <form onSubmit={salvarInstancia} className="space-y-3">
              <div>
                <label className="label">Nome da instância *</label>
                <input className="input" placeholder="Ex: Escritório Principal"
                  value={formInstancia.nome}
                  onChange={e => setFormInstancia(p => ({ ...p, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="label">URL da Evolution API *</label>
                <input className="input" placeholder="https://evolution.seudominio.com"
                  value={formInstancia.evolution_url}
                  onChange={e => setFormInstancia(p => ({ ...p, evolution_url: e.target.value }))} required />
              </div>
              <div>
                <label className="label">API Key *</label>
                <input className="input" placeholder="Sua chave de API"
                  value={formInstancia.evolution_key}
                  onChange={e => setFormInstancia(p => ({ ...p, evolution_key: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Nome da instância (Evolution) *</label>
                <input className="input" placeholder="Ex: juridico-crm"
                  value={formInstancia.instance_name}
                  onChange={e => setFormInstancia(p => ({ ...p, instance_name: e.target.value }))} required />
                <p className="text-xs text-gray-500 mt-1">Nome que será usado na Evolution API para identificar esta instância.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={salvandoInstancia} className="btn-primary flex-1">
                  {salvandoInstancia ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setModalInstancia(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — QR Code */}
      {modalQR !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 rounded-xl w-full max-w-sm p-6 text-center space-y-4 shadow-xl">
            <h2 className="text-base font-semibold text-white">Conectar — {modalQR.nome}</h2>
            {carregandoQR || !modalQR.qrcode ? (
              <div className="py-10">
                <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Gerando QR Code...</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400">Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo</p>
                <div className="bg-white p-3 rounded-lg inline-block">
                  <img src={modalQR.qrcode} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-gray-500 animate-pulse">Aguardando escaneamento...</p>
              </>
            )}
            <button onClick={() => fecharModalQR(modalQR.id)} className="btn-secondary w-full text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Notificações */}
      {abaAtiva === 'notificacoes' && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Notificações Push</h2>
          <p className="text-sm text-gray-400 mb-4">
            Receba alertas no navegador quando houver novas movimentações processuais,
            mesmo quando o sistema estiver minimizado.
          </p>
          <div className="space-y-3">
            <button onClick={testarPush} className="btn-primary">
              🔔 Testar Notificação Push
            </button>
            <p className="text-xs text-gray-500">
              As notificações push requerem que as chaves VAPID estejam configuradas no backend.
              Execute <code className="text-gold-400">web-push generate-vapid-keys</code> e adicione ao <code className="text-gold-400">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Sistema */}
      {abaAtiva === 'sistema' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">DataJud API</h2>
            <p className="text-xs text-gray-400 mb-3">
              A chave da API DataJud está configurada no backend. Para alterá-la, edite o arquivo <code className="text-gold-400">.env</code>
            </p>
            <div className="bg-navy-900 rounded-lg p-3 font-mono text-xs">
              <p className="text-gray-400">DATAJUD_API_KEY=<span className="text-gold-400">cDZHYz...dw== ✅</span></p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              O sistema consulta automaticamente o DataJud a cada <strong className="text-gray-300">6 horas</strong> para todos os processos em andamento.
              Você também pode consultar manualmente em cada processo.
            </p>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-2">Sobre o JurisCRM</h2>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Versão: <span className="text-gray-200">1.0.0</span></p>
              <p>Banco de dados: <span className="text-gray-200">PostgreSQL</span></p>
              <p>DataJud: <span className="text-gray-200">API Pública CNJ</span></p>
              <p>WhatsApp: <span className="text-gray-200">Evolution API</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
