import { useState, useEffect } from 'react';
import { authAPI, notificacoesAPI, whatsappAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Configuracoes() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('conta');
  const [usuarios, setUsuarios] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'advogado' });
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (abaAtiva === 'usuarios') carregarUsuarios();
    if (abaAtiva === 'whatsapp') verificarWhatsapp();
  }, [abaAtiva]);

  const carregarUsuarios = async () => {
    try { const r = await authAPI.listarUsuarios(); setUsuarios(r.data); } catch(e){}
  };

  const verificarWhatsapp = async () => {
    try { const r = await whatsappAPI.status(); setWhatsappStatus(r.data); } catch(e){}
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

  const desconectarWhatsapp = async () => {
    if (!confirm('Deseja desconectar o WhatsApp?')) return;
    try {
      await whatsappAPI.desconectar();
      verificarWhatsapp();
      mostrar('WhatsApp desconectado');
    } catch(err) {
      mostrar('Erro ao desconectar', true);
    }
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
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Status da Conexão</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${whatsappStatus?.conectado ? 'bg-green-400' : 'bg-red-400'}`} />
              <div>
                <p className="text-sm font-medium text-white">
                  {whatsappStatus?.conectado ? '✅ Conectado' : '❌ Desconectado'}
                </p>
                {whatsappStatus?.numero && (
                  <p className="text-xs text-gray-500">Número: {whatsappStatus.numero}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={verificarWhatsapp} className="btn-secondary text-xs">🔄 Atualizar Status</button>
              {whatsappStatus?.conectado && (
                <button onClick={desconectarWhatsapp} className="btn-danger text-xs">Desconectar</button>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-2">Evolution API</h2>
            <p className="text-xs text-gray-400 mb-4">
              Configure a URL e a chave da sua instância Evolution API no arquivo <code className="text-gold-400">.env</code> do backend.
            </p>
            <div className="bg-navy-900 rounded-lg p-3 font-mono text-xs text-gray-400 space-y-1">
              <p>EVOLUTION_API_URL=http://seu-servidor:8080</p>
              <p>EVOLUTION_API_KEY=sua_chave_aqui</p>
              <p>EVOLUTION_INSTANCE_NAME=juridico-crm</p>
            </div>
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
