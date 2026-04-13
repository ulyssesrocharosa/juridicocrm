import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_CORES = {
  prospecto:   '#6b7280',
  qualificado: '#3b82f6',
  ativo:       '#22c55e',
  encerrado:   '#a855f7',
  perdido:     '#ef4444',
};

function StatCard({ icon, label, valor, sub, cor = 'gold', onClick }) {
  const cores = {
    gold:   'from-gold-500/20 to-gold-500/5 border-gold-500/30',
    green:  'from-green-500/20 to-green-500/5 border-green-500/30',
    blue:   'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    red:    'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${cores[cor]} border rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{valor ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.dados()
      .then(res => setDados(res.data))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 text-sm">Carregando dashboard...</div>
    </div>
  );

  const { resumo, clientes_recentes, processos_com_novidades, leads_por_status, leads_por_mes, prazos_proximos, processos_sem_consulta } = dados || {};

  const pieData = (leads_por_status || []).map(s => ({
    name: s.status,
    value: s.total,
    fill: STATUS_CORES[s.status] || '#6b7280'
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral do escritório</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total de Clientes" valor={resumo?.total_clientes}
          sub={`${resumo?.clientes_ativos} ativos`} cor="blue"
          onClick={() => navigate('/clientes')} />
        <StatCard icon="🌱" label="Novos Leads" valor={resumo?.prospectos}
          sub="aguardando qualificação" cor="green"
          onClick={() => navigate('/clientes?status=prospecto')} />
        <StatCard icon="⚖️" label="Processos" valor={resumo?.total_processos}
          sub={`${resumo?.processos_andamento} em andamento`} cor="gold"
          onClick={() => navigate('/processos')} />
        <StatCard icon="📋" label="Novas Movimentações" valor={resumo?.novas_movimentacoes}
          sub="aguardando revisão" cor="purple"
          onClick={() => navigate('/processos')} />
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💬" label="Msgs WhatsApp" valor={resumo?.mensagens_nao_lidas || 0}
          sub="não lidas" cor="green"
          onClick={() => navigate('/whatsapp')} />
        <StatCard icon="🔔" label="Notificações" valor={resumo?.notificacoes_nao_lidas || 0}
          sub="não lidas" cor="red" />
        <StatCard icon="⏰" label="Prazos próximos" valor={(prazos_proximos || []).length}
          sub="nos próximos 7 dias" cor="gold"
          onClick={() => navigate('/agenda')} />
        <StatCard icon="🔄" label="Sem atualização" valor={processos_sem_consulta || 0}
          sub="processos há +30 dias" cor="purple"
          onClick={() => navigate('/processos')} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por mês */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">📈 Novos Leads por Mês</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={leads_por_mes || []}>
              <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#172d4a', border: '1px solid #1e4b85', borderRadius: 8 }}
                labelStyle={{ color: '#d4a017' }}
              />
              <Bar dataKey="total" fill="#d4a017" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads por status */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">🎯 Pipeline de Leads</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-xs text-gray-400 capitalize flex-1">{d.name}</span>
                    <span className="text-xs font-semibold text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum cliente cadastrado</p>
          )}
        </div>
      </div>

      {/* Prazos próximos */}
      {(prazos_proximos || []).length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">⏰ Prazos nos Próximos 7 Dias</h2>
            <button onClick={() => navigate('/agenda')} className="text-xs text-gold-400 hover:text-gold-300">
              Ver agenda →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(prazos_proximos || []).map(p => {
              const hoje = new Date(); hoje.setHours(0,0,0,0);
              const venc = new Date(p.data_vencimento + 'T00:00:00');
              const diff = Math.round((venc - hoje) / (1000*60*60*24));
              const label = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${diff} dias`;
              const corLabel = diff === 0 ? 'text-red-400' : diff <= 2 ? 'text-orange-400' : 'text-yellow-400';
              return (
                <div key={p.id} onClick={() => navigate('/agenda')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-navy-700/50 border border-navy-600 hover:bg-navy-700 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{p.titulo}</p>
                    {p.cliente_nome && <p className="text-[10px] text-gray-500 truncate">{p.cliente_nome}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ${corLabel}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabelas de atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes recentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">👥 Clientes Recentes</h2>
            <button onClick={() => navigate('/clientes')} className="text-xs text-gold-400 hover:text-gold-300">
              Ver todos →
            </button>
          </div>
          <div className="space-y-2">
            {(clientes_recentes || []).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhum cliente ainda</p>
            ) : (clientes_recentes || []).map(c => (
              <div key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-navy-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/clientes/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-navy-700 rounded-full flex items-center justify-center text-xs font-bold text-gold-400">
                    {c.nome[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.area_juridica || 'Sem área definida'}</p>
                  </div>
                </div>
                <span className={`badge badge-${c.status_lead}`}>{c.status_lead}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Processos com novidades */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">📋 Processos com Novidades</h2>
            <button onClick={() => navigate('/processos')} className="text-xs text-gold-400 hover:text-gold-300">
              Ver todos →
            </button>
          </div>
          <div className="space-y-2">
            {(processos_com_novidades || []).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma novidade pendente</p>
            ) : (processos_com_novidades || []).map(p => (
              <div key={p.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-navy-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/processos/${p.id}`)}
              >
                <div>
                  <p className="text-xs font-medium text-gold-400 font-mono">{p.numero_cnj}</p>
                  <p className="text-xs text-gray-400">{p.cliente_nome}</p>
                </div>
                <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30">
                  {p.novas_movimentacoes} nova{p.novas_movimentacoes !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
