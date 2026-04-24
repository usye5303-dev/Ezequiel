import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Download } from 'lucide-react';
import { exportToExcel } from '../lib/excel';

import { useAuth } from '../hooks/useAuth';

export default function DREView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubE = onSnapshot(query(collection(db, 'entries'), where('userId', '==', user.uid)), (s) => setEntries(s.docs.map(d => d.data())));
    const unsubEx = onSnapshot(query(collection(db, 'exits'), where('userId', '==', user.uid)), (s) => setExits(s.docs.map(d => d.data())));
    return () => { unsubE(); unsubEx(); };
  }, [user]);

  // Agrupar por mes
  const calculateDRE = () => {
    const months: any = {};
    const now = new Date();
    
    // Pegar últimos 6 meses
    for (let i = 0; i < 6; i++) {
       const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
       const key = format(date, 'yyyy-MM');
       months[key] = {
          name: format(date, 'MMM/yy'),
          receita: 0,
          materiaPrima: 0,
          maoDeObra: 0,
          marketing: 0,
          fixas: 0,
          comissao: 0,
          transporte: 0
       };
    }

    entries.forEach(e => {
       const key = e.data.substring(0, 7);
       if (months[key]) months[key].receita += e.valor;
    });

    exits.forEach(ex => {
       const key = ex.data.substring(0, 7);
       if (months[key]) {
          if (ex.categoria === 'matéria-prima') months[key].materiaPrima += ex.valor;
          else if (ex.categoria === 'mão de obra') months[key].maoDeObra += ex.valor;
          else if (ex.categoria === 'marketing') months[key].marketing += ex.valor;
          else if (ex.categoria === 'comissão') months[key].comissao += ex.valor;
          else if (ex.categoria === 'despesas fixas' || 
                   ex.categoria === 'pró-labore gilson' || 
                   ex.categoria === 'pró-labore camila' || 
                   ex.categoria === 'pró-labore ezequiel') months[key].fixas += ex.valor;
          else if (ex.categoria === 'transporte') months[key].transporte += ex.valor;
       }
    });

    return Object.values(months).reverse();
  };

  const dreData = calculateDRE();

  const handleExportDRE = () => {
    const data = dreData.map((m: any) => ({
      'Mês': m.name,
      'Receita Bruta': m.receita,
      'Matéria-prima': m.materiaPrima,
      'Mão de obra': m.maoDeObra,
      'Marketing': m.marketing,
      'Despesas Fixas': m.fixas,
      'Outros': m.comissao + m.transporte,
      'Lucro Líquido': m.receita - m.materiaPrima - m.maoDeObra - m.marketing - m.fixas - m.comissao - m.transporte
    }));
    exportToExcel(data, `DRE_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a]">DRE</h2>
          <p className="text-sm text-[#64748b]">Demonstrativo de Resultado do Exercício mensal.</p>
        </div>
        <button 
          onClick={handleExportDRE}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={16} /> Exportar Relatório
        </button>
      </header>

      <div className="overflow-x-auto pb-4">
        <div className="min-w-[800px] card-polish overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8fafc] text-[#64748b] font-bold uppercase text-[10px] tracking-wider border-b border-[#f1f5f9]">
              <tr>
                <th className="px-6 py-4">Categoria</th>
                {dreData.map((m: any) => <th key={m.name} className="px-6 py-4">{m.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              <tr className="bg-[#ecfdf5]">
                <td className="px-6 py-4 font-extrabold text-[#065f46]">RECEITA BRUTA</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 font-extrabold text-[#166534]">{formatCurrency(m.receita)}</td>)}
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[#475569]">Matéria-prima</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 text-red-500 font-medium">{formatCurrency(m.materiaPrima)}</td>)}
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[#475569]">Mão de obra</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 text-red-500 font-medium">{formatCurrency(m.maoDeObra)}</td>)}
              </tr>
              <tr className="bg-[#f8fafc]">
                <td className="px-6 py-4 font-bold italic text-[#1e293b]">Margem Bruta</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 font-bold text-[#1e293b]">{formatCurrency(m.receita - m.materiaPrima - m.maoDeObra)}</td>)}
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[#475569]">Marketing</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 text-red-500 font-medium">{formatCurrency(m.marketing)}</td>)}
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[#475569]">Despesas Fixas</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 text-red-500 font-medium">{formatCurrency(m.fixas)}</td>)}
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[#475569]">Outros (Comissão + Transp)</td>
                {dreData.map((m: any) => <td key={m.name} className="px-6 py-4 text-red-500 font-medium">{formatCurrency(m.comissao + m.transporte)}</td>)}
              </tr>
              <tr className="bg-[#0f172a] text-white">
                <td className="px-6 py-4 font-extrabold uppercase tracking-widest text-[11px]">Lucro Líquido</td>
                {dreData.map((m: any) => {
                  const lucro = m.receita - m.materiaPrima - m.maoDeObra - m.marketing - m.fixas - m.comissao - m.transporte;
                  return <td key={m.name} className="px-6 py-4 font-extrabold text-[#f59e0b]">{formatCurrency(lucro)}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
}
