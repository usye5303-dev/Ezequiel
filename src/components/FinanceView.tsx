import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, ArrowLeftRight, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToExcel } from '../lib/excel';

import { useAuth } from '../hooks/useAuth';

export default function FinanceView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<'entry' | 'exit' | null>(null);
  const [filter, setFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportFinance = () => {
    if (filteredTransactions.length === 0) return;
    
    const data = filteredTransactions.map(t => ({
      'Tipo': t.type === 'entry' ? 'Entrada' : 'Saída',
      'Valor': t.valor,
      'Data': t.data,
      'Descrição': t.descricao || '',
      'Cliente/Ref': t.cliente || '',
      'Categoria': t.categoria || '',
      'Forma Pgto': t.forma_pagamento || ''
    }));
    
    exportToExcel(data, `Financeiro_${new Date().toISOString().split('T')[0]}`);
  };

  // Form states
  const [formData, setFormData] = useState({
    valor: '',
    data: new Date().toISOString().split('T')[0],
    cliente: '',
    descricao: '',
    tipo: 'sinal',
    forma_pagamento: 'pix',
    categoria: 'matéria-prima'
  });

  useEffect(() => {
    if (!user) return;

    const qEntries = query(collection(db, 'entries'), where('userId', '==', user.uid));
    const qExits = query(collection(db, 'exits'), where('userId', '==', user.uid));

    const unsubE = onSnapshot(qEntries, 
      (snap) => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro ao carregar entradas:", err)
    );
    const unsubEx = onSnapshot(qExits, 
      (snap) => setExits(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro ao carregar saídas:", err)
    );

    return () => { unsubE(); unsubEx(); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const valorTratado = formData.valor.replace(',', '.');
    const valorFloat = parseFloat(valorTratado);

    if (isNaN(valorFloat)) {
      setError("Por favor, insira um valor válido.");
      setIsSubmitting(false);
      return;
    }

    const data = {
      valor: valorFloat,
      data: formData.data,
      descricao: formData.descricao,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

    try {
      if (showModal === 'entry') {
        await addDoc(collection(db, 'entries'), {
          ...data,
          cliente: formData.cliente,
          tipo: formData.tipo,
          forma_pagamento: formData.forma_pagamento
        });
      } else {
        await addDoc(collection(db, 'exits'), {
          ...data,
          categoria: formData.categoria
        });
      }
      setShowModal(null);
      setFormData({ ...formData, valor: '', descricao: '', cliente: '' });
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar. Verifique sua conexão ou se todos os campos estão corretos.");
      // handleFirestoreError(err, 'create', showModal === 'entry' ? 'entries' : 'exits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTransaction = async (id: string, type: 'entry' | 'exit') => {
    if (window.confirm('Excluir transação?')) {
      await deleteDoc(doc(db, type === 'entry' ? 'entries' : 'exits', id));
    }
  };

  const allTransactions = [
    ...entries.map(e => ({ ...e, type: 'entry' })),
    ...exits.map(e => ({ ...e, type: 'exit' }))
  ].sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const filteredTransactions = allTransactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Financeiro</h2>
          <p className="text-sm text-[#64748b]">Gerencie todas as entradas e saídas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
             onClick={handleExportFinance}
             title="Exportar para Excel"
             className="p-2.5 text-slate-600 hover:bg-white rounded-lg transition-colors border border-[#e2e8f0] bg-white shadow-sm flex items-center gap-2 text-xs font-bold"
          >
            <Download size={16} /> Exportar
          </button>
          <button 
            onClick={() => setShowModal('entry')}
            className="btn-polish-primary"
          >
            <Plus size={18} className="inline mr-2" /> Entrada
          </button>
          <button 
            onClick={() => setShowModal('exit')}
            className="bg-[#0f172a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center"
          >
            <Plus size={18} className="inline mr-2" /> Saída
          </button>
        </div>
      </div>

      <div className="card-polish overflow-hidden">
        <div className="p-4 border-b border-[#f1f5f9] flex items-center justify-between bg-[#f8fafc]">
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
            <ArrowLeftRight size={14} className="text-[#f59e0b]" /> Histórico de Lançamentos
          </h3>
          <div className="flex bg-[#e2e8f0] p-0.5 rounded-lg">

            {['all', 'entry', 'exit'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {f === 'all' ? 'Tudo' : f === 'entry' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="p-4 flex items-center gap-3 active:bg-gray-50 transition">
              <div className={`p-2 rounded-full ${t.type === 'entry' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {t.type === 'entry' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{t.descricao || (t.type === 'entry' ? `Entrada - ${t.cliente}` : `Saída - ${t.categoria}`)}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                   <span>{formatDate(t.data)}</span>
                   <span>•</span>
                   <span className="capitalize">{t.forma_pagamento || t.categoria}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <p className={`text-sm font-bold ${t.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                   {t.type === 'entry' ? '+' : '-'}{formatCurrency(t.valor)}
                </p>
                <button 
                  onClick={() => deleteTransaction(t.id, t.type as any)}
                  className="text-gray-300 hover:text-red-500 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500">Nenhuma transação encontrada.</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl relative"
          >
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-400">Fechar</button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              {showModal === 'entry' ? <ArrowUpCircle className="text-green-600"/> : <ArrowDownCircle className="text-red-600"/>}
              Adicionar {showModal === 'entry' ? 'Entrada' : 'Saída'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-pulse">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                <input 
                  type="number" step="0.01" required
                  value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0,00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                  <input 
                    type="date" required
                    value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
                {showModal === 'entry' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma</label>
                    <select 
                      value={formData.forma_pagamento} onChange={e => setFormData({...formData, forma_pagamento: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartão">Cartão</option>
                      <option value="boleto">Boleto</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                    <select 
                      value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                    >
                      <option value="matéria-prima">Matéria-prima</option>
                      <option value="mão de obra">Mão de obra</option>
                      <option value="marketing">Marketing</option>
                      <option value="comissão">Comissão</option>
                      <option value="despesas fixas">Despesas fixas</option>
                      <option value="transporte">Transporte</option>
                      <option value="pró-labore gilson">Pró-labore Gilson</option>
                      <option value="pró-labore camila">Pró-labore Camila</option>
                      <option value="pró-labore ezequiel">Pró-labore Ezequiel</option>
                    </select>
                  </div>
                )}
              </div>
              {showModal === 'entry' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                  <input 
                    value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                    placeholder="Nome do cliente"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                <input 
                  value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                  placeholder="Ex: Pagamento parcela 1..."
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition disabled:opacity-50 ${
                showModal === 'entry' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
                {isSubmitting ? 'Processando...' : 'Confirmar Lançamento'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
