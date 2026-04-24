import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Target, ShoppingBag, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { useAuth } from '../hooks/useAuth';

export default function DashboardView() {
  const { user } = useAuth();
  const { alerts, toggleRead, dismissAlert, readAlerts } = useAlerts();
  const [contracts, setContracts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const qContracts = query(collection(db, 'contracts'), where('userId', '==', user.uid));
    const qEntries = query(collection(db, 'entries'), where('userId', '==', user.uid));
    const qExits = query(collection(db, 'exits'), where('userId', '==', user.uid));
    const qInst = query(collection(db, 'installments'), where('userId', '==', user.uid));

    const unsubC = onSnapshot(qContracts, (snap) => setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubE = onSnapshot(qEntries, (snap) => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEx = onSnapshot(qExits, (snap) => setExits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInst = onSnapshot(qInst, (snap) => setInstallments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubC(); unsubE(); unsubEx(); unsubInst(); };
  }, [user]);

  const totalEntries = entries.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalExits = exits.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const balance = totalEntries - totalExits;
  const closedContracts = contracts.filter(c => c.status === 'Fechado');
  const revenueTotal = closedContracts.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);
  const ticketMedio = closedContracts.length > 0 ? revenueTotal / closedContracts.length : 0;

  const stats = [
    { label: 'Faturamento', value: formatCurrency(revenueTotal), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Entradas', value: formatCurrency(totalEntries), icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Saídas', value: formatCurrency(totalExits), icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Saldo', value: formatCurrency(balance), icon: Target, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Contratos', value: closedContracts.length, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Resumo do Mês</h2>
          <p className="text-sm text-[#64748b]">Turen Controle Financeiro</p>
        </div>
      </header>

      {/* Stats Grid - 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.slice(0, 4).map((stat, i) => (
          <div key={i} className="card-polish p-4">
            <span className="stat-label-polish">{stat.label}</span>
            <div className="stat-value-polish">{stat.value}</div>
            <div className="text-[11px] mt-2 flex items-center gap-1 text-[#f59e0b] font-medium">
              <TrendingUp size={12} />
              <span>Acompanhamento real</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 card-polish p-6 h-[400px]">
          <h3 className="text-[16px] font-bold text-[#0f172a] mb-6">Faturamento Semanal</h3>
          <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[
                 { name: 'Sem 01', valor: totalEntries * 0.2 },
                 { name: 'Sem 02', valor: totalEntries * 0.3 },
                 { name: 'Sem 03', valor: totalEntries * 0.4 },
                 { name: 'Sem 04', valor: totalEntries * 0.1 }
               ]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#64748b'}} />
                 <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#64748b'}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} />
                 <Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts & Follow-up Section */}
        <div className="card-polish p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-bold text-[#0f172a]">Alertas</h3>
            <span className="bg-[#fee2e2] text-[#991b1b] px-2 py-1 rounded-full text-[10px] font-bold uppercase">
              {alerts.filter(a => !readAlerts.includes(a.id)).length} novos
            </span>
          </div>
          
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert, i) => {
                const isRead = readAlerts.includes(alert.id);
                return (
                  <div key={i} className={cn(
                    "flex justify-between items-start pb-4 border-b border-[#f1f5f9] last:border-0 last:pb-0 group",
                    isRead && "opacity-50"
                  )}>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-[#1e293b]">{alert.title}</div>
                      <div className={cn("text-[11px]", isRead ? "text-slate-400" : "text-[#64748b]")}>{alert.message}</div>
                      {alert.info && <div className="text-[9px] text-slate-400 italic mt-0.5">{alert.info}</div>}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                        alert.priority === 'Urgente' ? "bg-red-100 text-red-600" :
                        alert.priority === 'Hoje' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                      )}>{alert.priority}</div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleRead(alert.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        >
                          {isRead ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                        <button 
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 text-center py-10 italic">Nenhum alerta pendente</p>
            )}
            
            <div className="pt-4 text-center">
              <button className="text-[#f59e0b] text-[12px] font-bold hover:underline">
                Ver todos os alertas →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Table */}
      <div className="card-polish p-6">
        <h3 className="font-bold text-[#0f172a] mb-4">Últimos Contratos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.slice(0, 4).map((contract) => (
            <div key={contract.id} className="flex items-center justify-between p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-xl hover:bg-white transition-colors cursor-pointer">
              <div>
                <p className="font-bold text-sm text-[#0f172a]">{contract.cliente_nome}</p>
                <p className="text-[11px] text-[#64748b]">{contract.cidade} • {contract.quantidade} unidades</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-[#f59e0b]">{formatCurrency(contract.valor_total)}</p>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                  contract.status === 'Fechado' ? 'bg-[#dcfce7] text-[#166534]' : 
                  contract.status === 'Perdido' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#e0f2fe] text-[#0369a1]'
                }`}>
                  {contract.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

