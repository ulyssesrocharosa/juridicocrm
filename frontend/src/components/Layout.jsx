import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificacoesAPI } from '../api';
import { useSocket } from '../hooks/useSocket';

const NAV_ITEMS = [
  { path: '/',            icon: '🏠', label: 'Dashboard' },
  { path: '/clientes',   icon: '👥', label: 'Clientes' },
  { path: '/processos',  icon: '⚖️',  label: 'Processos' },
  { path: '/agenda',     icon: '📅', label: 'Agenda' },
  { path: '/whatsapp',   icon: '💬', label: 'WhatsApp' },
  { path: '/configuracoes', icon: '⚙️', label: 'Configurações' },
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [msgNaoLidas, setMsgNaoLidas] = useState(0);

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 60000);
    return () => clearInterval(interval);
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const res = await notificacoesAPI.listar({ limite: 10 });
      setNotifs(res.data.notificacoes || []);
      setNaoLidas(res.data.nao_lidas || 0);
    } catch (e) {}
  };

  useSocket(
    (data) => {
      setMsgNaoLidas(prev => prev + 1);
      mostrarToast(`💬 Nova mensagem WhatsApp`, data.conteudo?.slice(0, 60));
    },
    (data) => {
      setNaoLidas(prev => prev + 1);
      carregarNotificacoes();
      mostrarToast(`📋 Nova movimentação`, `Processo ${data.numero_cnj}`);
    },
    null
  );

  const [toast, setToast] = useState(null);
  const mostrarToast = (titulo, mensagem) => {
    setToast({ titulo, mensagem });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const marcarTodasLidas = async () => {
    await notificacoesAPI.marcarTodasLidas();
    setNaoLidas(0);
    setNotifs(prev => prev.map(n => ({ ...n, lida: 1 })));
  };

  const perfis = { admin: 'Administrador', advogado: 'Advogado', assistente: 'Assistente' };

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      {/* Sidebar */}
      <aside className={`${sidebarAberta ? 'w-60' : 'w-16'} flex-shrink-0 bg-navy-800 border-r border-navy-700 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
            ⚖
          </div>
          {sidebarAberta && (
            <div>
              <p className="font-bold text-white text-sm">JurisCRM</p>
              <p className="text-xs text-gray-500">Gestão Jurídica</p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const ativo = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`sidebar-link w-full ${ativo ? 'active' : ''}`}
                title={!sidebarAberta ? item.label : ''}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {sidebarAberta && <span>{item.label}</span>}
                {item.path === '/whatsapp' && msgNaoLidas > 0 && sidebarAberta && (
                  <span className="ml-auto bg-gold-500 text-navy-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {msgNaoLidas > 9 ? '9+' : msgNaoLidas}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="mx-2 mb-2 p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-navy-700 transition-colors text-xs"
        >
          {sidebarAberta ? '◀ Recolher' : '▶'}
        </button>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-navy-800 border-b border-navy-700 flex items-center justify-between px-5 flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-300">
            {NAV_ITEMS.find(n => n.path === location.pathname)?.label ||
             NAV_ITEMS.find(n => location.pathname.startsWith(n.path) && n.path !== '/')?.label || ''}
          </h1>

          <div className="flex items-center gap-3">
            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
                className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-navy-700 transition-colors"
              >
                🔔
                {naoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-navy-800 border border-navy-600 rounded-xl shadow-2xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700">
                    <span className="text-sm font-semibold">Notificações</span>
                    {naoLidas > 0 && (
                      <button onClick={marcarTodasLidas} className="text-xs text-gold-400 hover:text-gold-300">
                        Marcar todas lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-6">Nenhuma notificação</p>
                    ) : notifs.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-navy-700 hover:bg-navy-700 cursor-pointer transition-colors ${!n.lida ? 'bg-navy-750' : ''}`}
                        onClick={() => {
                          notificacoesAPI.marcarLida(n.id);
                          if (n.link) { navigate(n.link); setShowNotifs(false); }
                        }}
                      >
                        <p className={`text-xs font-medium ${!n.lida ? 'text-white' : 'text-gray-300'}`}>{n.titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(n.criado_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Usuário */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
              >
                <div className="w-7 h-7 bg-gold-500 rounded-full flex items-center justify-center text-navy-900 font-bold text-xs">
                  {usuario?.nome?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-medium text-gray-200">{usuario?.nome}</p>
                  <p className="text-[10px] text-gray-500">{perfis[usuario?.perfil] || ''}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-48 bg-navy-800 border border-navy-600 rounded-xl shadow-2xl z-50 animate-fade-in">
                  <button onClick={() => { navigate('/configuracoes'); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-navy-700 rounded-t-xl transition-colors">
                    ⚙️ Configurações
                  </button>
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-navy-700 rounded-b-xl transition-colors">
                    🚪 Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Toast de notificação */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-navy-700 border border-navy-600 rounded-xl px-4 py-3 shadow-2xl animate-fade-in z-50 max-w-xs">
          <p className="text-sm font-semibold text-white">{toast.titulo}</p>
          <p className="text-xs text-gray-400 mt-0.5">{toast.mensagem}</p>
        </div>
      )}

      {/* Overlay para fechar menus */}
      {(showNotifs || showUserMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotifs(false); setShowUserMenu(false); }} />
      )}
    </div>
  );
}
