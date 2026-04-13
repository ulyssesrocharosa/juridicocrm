import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Processos from './pages/Processos';
import WhatsApp from './pages/WhatsApp';
import Agenda from './pages/Agenda';
import Configuracoes from './pages/Configuracoes';

function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center">
          <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 animate-pulse">⚖</div>
          <p className="text-gray-500 text-sm">Carregando JurisCRM...</p>
        </div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
      <Route path="/clientes/:id" element={<RotaProtegida><ClienteDetalhe /></RotaProtegida>} />
      <Route path="/processos" element={<RotaProtegida><Processos /></RotaProtegida>} />
      <Route path="/processos/:id" element={<RotaProtegida><Processos /></RotaProtegida>} />
      <Route path="/whatsapp" element={<RotaProtegida><WhatsApp /></RotaProtegida>} />
      <Route path="/agenda" element={<RotaProtegida><Agenda /></RotaProtegida>} />
      <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
