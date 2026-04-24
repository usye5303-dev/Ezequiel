import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

import { useAuth } from '../hooks/useAuth';

export default function AnalyticsView() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'contracts'), where('userId', '==', user.uid)), (s) => 
      setContracts(s.docs.map(d => d.data()))
    );
  }, [user]);

  const byOrigin = contracts.reduce((acc: any, curr) => {
    acc[curr.origem] = (acc[curr.origem] || 0) + 1;
    return acc;
  }, {});

  const revenueByOrigin = contracts.reduce((acc: any, curr) => {
    if (curr.status === 'Fechado') {
      acc[curr.origem] = (acc[curr.origem] || 0) + curr.valor_total;
    }
    return acc;
  }, {});

  const dataPie = Object.keys(byOrigin).map(key => ({ name: key, value: byOrigin[key] }));
  const dataBar = Object.keys(revenueByOrigin).map(key => ({ name: key, total: revenueByOrigin[key] }));

  const COLORS = ['#16a34a', '#2563eb', '#9333ea', '#ea580c', '#64748b'];

  const conversionRate = contracts.length > 0 
    ? (contracts.filter(c => c.status === 'Fechado').length / contracts.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f172a]">Análises</h2>
        <p className="text-sm text-[#64748b]">Inteligencia comercial e origem de clientes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-polish p-6">
          <h3 className="text-[15px] font-bold text-[#0f172a] mb-6">Contratos por Origem</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={{fontSize: 10, fill: '#64748b'}}>
                    {dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="card-polish p-6">
          <h3 className="text-[15px] font-bold text-[#0f172a] mb-6">Faturamento por Origem</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dataBar} layout="vertical" margin={{left: 20}}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#64748b'}} />
                 <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{fill: '#f8fafc'}} />
                 <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <div className="card-polish p-5">
           <p className="stat-label-polish">Conversão</p>
           <p className="text-2xl font-bold text-[#f59e0b]">{conversionRate.toFixed(1)}%</p>
        </div>
        <div className="card-polish p-5">
           <p className="stat-label-polish">Total Leads</p>
           <p className="text-2xl font-bold text-[#0f172a]">{contracts.length}</p>
        </div>
        <div className="card-polish p-5">
           <p className="stat-label-polish">Sinal Médio</p>
           <p className="text-2xl font-bold text-[#64748b]">30%</p>
        </div>
        <div className="card-polish p-5">
           <p className="stat-label-polish">Top Origem</p>
           <p className="text-[13px] font-bold text-[#f59e0b] truncate uppercase">{dataPie[0]?.name || '-'}</p>
        </div>
      </div>
    </div>

  );
}
