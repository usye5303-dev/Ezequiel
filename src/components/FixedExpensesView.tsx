import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, Calendar, Tag, DollarSign, Edit2, Check, X, ArrowDownCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function FixedExpensesView() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    valor_estimado: '',
    dia_vencimento: '',
    categoria: 'Geral'
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'fixed_expenses'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const handleLaunchPayment = async (expense: any) => {
    if (!user) return;
    setIsLaunching(expense.id);
    try {
      await addDoc(collection(db, 'exits'), {
        valor: expense.valor_estimado || 0,
        data: new Date().toISOString().split('T')[0],
        descricao: expense.nome || 'Despesa Fixa',
        categoria: 'despesas fixas',
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      alert('Pagamento lançado com sucesso no financeiro!');
    } catch (err) {
      console.error(err);
      alert('Erro ao lançar pagamento.');
    } finally {
      setIsLaunching(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const data = {
      nome: formData.nome,
      valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : 0,
      dia_vencimento: formData.dia_vencimento ? parseInt(formData.dia_vencimento) : 0,
      categoria: formData.categoria,
      userId: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'fixed_expenses', editingId), data);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'fixed_expenses'), data);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      valor_estimado: '',
      dia_vencimento: '',
      categoria: 'Geral'
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta despesa fixa?')) {
      await deleteDoc(doc(db, 'fixed_expenses', id));
    }
  };

  const openEdit = (expense: any) => {
    setEditingId(expense.id);
    setFormData({
      nome: expense.nome || '',
      valor_estimado: expense.valor_estimado?.toString() || '',
      dia_vencimento: expense.dia_vencimento?.toString() || '',
      categoria: expense.categoria || 'Geral'
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Despesas Fixas</h2>
          <p className="text-sm text-[#64748b]">Cadastre seus custos recorrentes mensais.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
          className="btn-polish-primary"
        >
          <Plus size={18} className="inline mr-2" /> Nova Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="card-polish p-5 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                  <Tag size={20} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(expense)} className="text-slate-400 hover:text-blue-500 p-1">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(expense.id)} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{expense.nome || 'Sem Nome'}</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">{expense.categoria || 'Geral'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Previsão</p>
                <p className="font-bold text-slate-700">{formatCurrency(expense.valor_estimado || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Dia Venc.</p>
                <p className="font-bold text-slate-700">{expense.dia_vencimento || '--'}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50">
              <button 
                onClick={() => handleLaunchPayment(expense)}
                disabled={isLaunching === expense.id}
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isLaunching === expense.id ? 'Lançando...' : <><ArrowDownCircle size={14}/> Lançar Pagamento</>}
              </button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <DollarSign className="mx-auto text-slate-300 mb-2" size={48} />
            <p className="text-slate-400 font-medium">Nenhuma despesa fixa cadastrada.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
          >
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400"><X size={20}/></button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-[#f59e0b]"/>
              {editingId ? 'Editar Despesa Fixa' : 'Cadastrar Despesa Fixa'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome/Descrição (Opcional)</label>
                <input 
                  type="text"
                  value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"
                  placeholder="Ex: Aluguel, Luz, Internet..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Estimado (Opcional)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.valor_estimado} onChange={e => setFormData({...formData, valor_estimado: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Vencimento (Opcional)</label>
                  <input 
                    type="number" min="1" max="31"
                    value={formData.dia_vencimento} onChange={e => setFormData({...formData, dia_vencimento: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"
                    placeholder="1 a 31"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria (Opcional)</label>
                <input 
                  type="text"
                  value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"
                  placeholder="Ex: Administrativo, Fábrica..."
                />
              </div>

              <button className="w-full py-4 mt-4 bg-[#0f172a] text-white rounded-xl font-bold hover:brightness-110 shadow-lg transition">
                {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
