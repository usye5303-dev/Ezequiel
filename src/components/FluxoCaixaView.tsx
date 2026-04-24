import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { formatCurrency, formatDate } from '../lib/utils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowLeftRight } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';

export default function FluxoCaixaView() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const qE = query(collection(db, 'entries'), where('userId', '==', user.uid), orderBy('data', 'asc'));
    const qEx = query(collection(db, 'exits'), where('userId', '==', user.uid), orderBy('data', 'asc'));

    const unsubE = onSnapshot(qE, (snapE) => {
      onSnapshot(qEx, (snapEx) => {
        const entries = snapE.docs.map(d => ({ ...d.data(), type: 'entry' }));
        const exits = snapEx.docs.map(d => ({ ...d.data(), type: 'exit' }));
        const combined = [...entries, ...exits].sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
        
        let cumulative = 0;
        const mapped = combined.map((t: any) => {
          cumulative += t.type === 'entry' ? t.valor : -t.valor;
          return {
            ...t,
            saldo: cumulative,
            label: formatDate(t.data)
          };
        });
        setTransactions(mapped);
      });
    });

    return unsubE;
  }, [user]);

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f172a]">Fluxo de Caixa</h2>
        <p className="text-sm text-[#64748b]">Visualize a evolução do saldo da sua empresa.</p>
      </header>

      <div className="card-polish p-6">
        <h3 className="text-[16px] font-bold text-[#0f172a] mb-6">Evolução do Saldo</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transactions}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" hide />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#64748b'}} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-polish overflow-hidden">
        <div className="p-4 border-b border-[#f1f5f9] font-bold text-[#64748b] text-xs uppercase tracking-wider flex items-center gap-2 bg-[#f8fafc]">
          <ArrowLeftRight size={14} className="text-[#f59e0b]" /> Lançamentos Ordenados
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {[...transactions].reverse().map((t, i) => (
            <div key={i} className="p-4 flex justify-between items-center text-sm hover:bg-[#f8fafc] transition-colors">
              <div>
                <p className="font-bold text-[#0f172a]">{t.descricao || (t.type === 'entry' ? 'Entrada' : 'Saída')}</p>
                <p className="text-[11px] text-[#64748b]">{formatDate(t.data)}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${t.type === 'entry' ? 'text-[#f59e0b]' : 'text-red-500'}`}>
                  {t.type === 'entry' ? '+' : '-'}{formatCurrency(t.valor)}
                </p>
                <p className="text-[10px] text-slate-400">Saldo: {formatCurrency(t.saldo)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

  );
}
