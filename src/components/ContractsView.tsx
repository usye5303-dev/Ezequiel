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
  updateDoc,
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Plus, Search, MapPin, Phone, Calendar, Trash2, Edit2, CheckCircle2, Clock, XCircle, FileText, Paperclip, Download, FileUp, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToExcel, parseExcelFile } from '../lib/excel';

import { useAuth } from '../hooks/useAuth';

export default function ContractsView() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [plannedInstallments, setPlannedInstallments] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    cliente_nome: '',
    cpf: '',
    data_nascimento: '',
    telefone: '',
    cidade: '',
    endereco: '',
    cep: '',
    valor_total: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    origem: 'Google',
    tipo_produto: 'Porta 35mm',
    quantidade: '1',
    condicao_pagamento: '',
    valor_entrada: '',
    num_parcelas: '0',
    status: 'Orçamento',
    observacoes: '',
    anexos: [] as any[],
    representante_nome: '',
    comissao_valor: '',
    comissao_paga: false
  });

  // Atualiza as parcelas planejadas quando a quantidade muda
  useEffect(() => {
    const num = parseInt(formData.num_parcelas) || 0;
    if (num > 0) {
      const rest = (parseFloat(formData.valor_total) || 0) - (parseFloat(formData.valor_entrada) || 0);
      const valPerPart = rest > 0 ? (rest / num).toFixed(2) : '0';
      
      const newPlanned = Array.from({ length: num }).map((_, i) => {
        const date = new Date(formData.data_fechamento);
        date.setDate(date.getDate() + ((i + 1) * 30));
        return {
          valor: parseFloat(valPerPart),
          data_vencimento: date.toISOString().split('T')[0],
          status: 'pendente'
        };
      });
      setPlannedInstallments(newPlanned);
    } else {
      setPlannedInstallments([]);
    }
  }, [formData.num_parcelas, formData.valor_total, formData.valor_entrada, formData.data_fechamento]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'contracts'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const qInst = query(collection(db, 'installments'), where('userId', '==', user.uid));
    
    const unsub = onSnapshot(q, (snap) => setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInst = onSnapshot(qInst, (snap) => setInstallments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsub(); unsubInst(); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Sanitize and validate data
    const valorTotal = parseFloat(formData.valor_total) || 0;
    if (valorTotal <= 0 && formData.status === 'Fechado') {
      alert("Por favor, informe o valor total do contrato.");
      return;
    }

    const data = {
      cliente_nome: formData.cliente_nome,
      cpf: formData.cpf || '',
      data_nascimento: formData.data_nascimento || '',
      telefone: formData.telefone || '',
      cidade: formData.cidade || '',
      endereco: formData.endereco || '',
      cep: formData.cep || '',
      valor_total: valorTotal,
      data_fechamento: formData.data_fechamento,
      origem: formData.origem,
      tipo_produto: formData.tipo_produto,
      quantidade: parseInt(formData.quantidade) || 0,
      condicao_pagamento: formData.condicao_pagamento || '',
      status: formData.status,
      observacoes: formData.observacoes || '',
      anexos: formData.anexos || [],
      representante_nome: formData.representante_nome || '',
      comissao_valor: parseFloat(formData.comissao_valor) || 0,
      comissao_paga: formData.comissao_paga || false,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    };

    setIsSaving(true);
    try {
      let contractId: string | null = null;
      if (selectedContract) {
         await updateDoc(doc(db, 'contracts', selectedContract.id), data);
         contractId = selectedContract.id;
      } else {
         const docRef = await addDoc(collection(db, 'contracts'), { ...data, createdAt: serverTimestamp() });
         contractId = docRef.id;
      }

      // Geração das parcelas planejadas (apenas para novos contratos)
      if (!selectedContract) {
         // 1. Registrar entrada (se houver)
         const valEntrada = parseFloat(formData.valor_entrada) || 0;
         if (valEntrada > 0) {
            await addDoc(collection(db, 'installments'), {
               contrato_id: contractId,
               valor: valEntrada,
               data_vencimento: formData.data_fechamento,
               status: 'pago',
               userId: user.uid
            });
            
            // Também registra no financeiro
            await addDoc(collection(db, 'entries'), {
               valor: valEntrada,
               data: formData.data_fechamento,
               cliente: formData.cliente_nome,
               descricao: `Entrada contrato`,
               tipo: 'sinal',
               forma_pagamento: 'pix',
               contrato_id: contractId,
               userId: user.uid,
               createdAt: serverTimestamp()
            });
         }

         // 2. Registrar parcelas planejadas
         for (const inst of plannedInstallments) {
            await addDoc(collection(db, 'installments'), {
               contrato_id: contractId,
               valor: inst.valor,
               data_vencimento: inst.data_vencimento,
               status: inst.status,
               userId: user.uid
            });
            
            // Se a parcela já foi marcada como paga no momento do cadastro
            if (inst.status === 'pago') {
              await addDoc(collection(db, 'entries'), {
                valor: inst.valor,
                data: inst.data_vencimento,
                cliente: formData.cliente_nome,
                descricao: `Parcela paga no fechamento`,
                tipo: 'parcial',
                forma_pagamento: 'pix',
                contrato_id: contractId,
                userId: user.uid,
                createdAt: serverTimestamp()
              });
            }
         }
      }

      // 3. Registrar comissão (se já foi paga no cadastro)
      if (!selectedContract && data.comissao_paga && data.comissao_valor > 0) {
        await addDoc(collection(db, 'exits'), {
          valor: data.comissao_valor,
          data: data.data_fechamento,
          descricao: `Comissão: ${data.representante_nome} - Ref: ${data.cliente_nome}`,
          categoria: 'comissão',
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }

      alert(selectedContract ? "Contrato atualizado com sucesso!" : "Contrato cadastrado com sucesso!");
      setShowModal(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, selectedContract ? 'update' : 'create', 'contracts');
      alert("Erro ao salvar contrato: Verifique os campos e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_nome: '', cpf: '', data_nascimento: '', telefone: '', cidade: '', endereco: '', cep: '',
      valor_total: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      origem: 'Google', tipo_produto: 'Porta 35mm', quantidade: '1',
      condicao_pagamento: '',
      valor_entrada: '',
      num_parcelas: '0',
      status: 'Orçamento', observacoes: '',
      anexos: [],
      representante_nome: '',
      comissao_valor: '',
      comissao_paga: false
    });
    setPlannedInstallments([]);
    setSelectedContract(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("O arquivo deve ter no máximo 500KB para ser anexo diretamente no contrato.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newAnexo = {
        nome: file.name,
        url: base64String,
        data: new Date().toISOString()
      };
      setFormData(prev => ({
        ...prev,
        anexos: [...(prev.anexos || []), newAnexo]
      }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeAnexo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      anexos: (prev.anexos || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleExport = () => {
    if (contracts.length === 0) return;
    
    // Prepare data for export
    const exportData = contracts.map(c => ({
      'Cliente': c.cliente_nome,
      'Telefone': c.telefone,
      'Cidade': c.cidade,
      'Valor Total': c.valor_total,
      'Data Fechamento': c.data_fechamento,
      'Status': c.status,
      'Produto': c.tipo_produto,
      'Quantidade': c.quantidade,
      'Origem': c.origem,
      'Representante': c.representante_nome || '',
      'Comissão': c.comissao_valor || 0,
      'Comissão Paga': c.comissao_paga ? 'Sim' : 'Não',
      'Observações': c.observacoes
    }));
    
    exportToExcel(exportData, `Contratos_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsImporting(true);
      const data = await parseExcelFile(file);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Planilha vazia ou em formato inválido.");
      }

      let count = 0;
      for (const row of data as any[]) {
        // Simple mapping based on common names
        const contractData = {
          cliente_nome: row['Cliente'] || row['Nome'] || row['cliente_nome'] || 'Importado',
          telefone: row['Telefone'] || row['Contato'] || '',
          cidade: row['Cidade'] || '',
          valor_total: parseFloat(row['Valor Total'] || row['Preço'] || row['valor_total'] || 0),
          data_fechamento: row['Data Fechamento'] || row['Data'] || new Date().toISOString().split('T')[0],
          origem: row['Origem'] || 'Outros',
          tipo_produto: row['Produto'] || 'Porta 35mm',
          quantidade: parseInt(row['Quantidade'] || row['Qtd'] || 1),
          status: row['Status'] || 'Fechado',
          observacoes: row['Observações'] || row['Obs'] || '',
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'contracts'), contractData);
        count++;
      }

      alert(`${count} contratos importados com sucesso!`);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao importar planilha: " + err.message);
    } finally {
      setIsImporting(false);
      e.target.value = ''; // clean input
    }
  };

  const deleteContract = async (id: string) => {
    try {
      // Encontrar parcelas vinculadas
      const contractInsts = installments.filter(i => i.contrato_id === id);
      
      // Deletar todas as parcelas primeiro
      const deletePromises = contractInsts.map(inst => deleteDoc(doc(db, 'installments', inst.id)));
      await Promise.all(deletePromises);

      // Deletar o contrato
      await deleteDoc(doc(db, 'contracts', id));
      alert("Contrato excluído com sucesso!");
      setIsDeleting(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', 'contracts');
      setIsDeleting(null);
    }
  };

  const toggleInstallment = async (inst: any) => {
    await updateDoc(doc(db, 'installments', inst.id), {
      status: inst.status === 'pago' ? 'pendente' : 'pago'
    });
    
    // Se marcou como pago, talvez queira adicionar uma entrada automática
    if (inst.status === 'pendente' && user) {
       await addDoc(collection(db, 'entries'), {
          valor: inst.valor,
          data: new Date().toISOString().split('T')[0],
          cliente: contracts.find(c => c.id === inst.contrato_id)?.cliente_nome || 'Parcela Contrato',
          descricao: `Parcela quitada do contrato`,
          tipo: 'parcial',
          forma_pagamento: 'pix',
          contrato_id: inst.contrato_id,
          userId: user.uid,
          createdAt: serverTimestamp()
       });
    }
  };

  const toggleCommission = async (contract: any) => {
    const newState = !contract.comissao_paga;
    
    await updateDoc(doc(db, 'contracts', contract.id), {
      comissao_paga: newState,
      updatedAt: serverTimestamp()
    });

    // Se marcou como pago, gera uma saída automática no financeiro
    if (newState && contract.comissao_valor > 0 && user) {
      await addDoc(collection(db, 'exits'), {
        valor: parseFloat(contract.comissao_valor),
        data: new Date().toISOString().split('T')[0],
        descricao: `Comissão: ${contract.representante_nome} - Ref: ${contract.cliente_nome}`,
        categoria: 'comissão',
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    }
  };

  const addInstallment = async (contractId: string) => {
    const val = prompt('Valor da parcela:');
    const date = prompt('Data de vencimento (AAAA-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!val || !date || !user) return;

    await addDoc(collection(db, 'installments'), {
      contrato_id: contractId,
      valor: parseFloat(val),
      data_vencimento: date,
      status: 'pendente',
      userId: user.uid
    });
  };

  const updateInstallmentValue = async (instId: string) => {
    const val = prompt('Novo valor da parcela:');
    if (!val) return;
    try {
      await updateDoc(doc(db, 'installments', instId), {
        valor: parseFloat(val)
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar valor.");
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Contratos</h2>
          <p className="text-sm text-[#64748b]">Gerencie vendas, orçamentos e parcelas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white border border-[#e2e8f0] rounded-xl p-1 shadow-sm">
            <button 
              onClick={handleExport}
              title="Exportar para Excel"
              className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <Download size={16} /> Exportar
            </button>
            <div className="w-[1px] bg-[#e2e8f0] my-2"></div>
            <label className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer">
              <FileUp size={16} /> {isImporting ? 'Lendo...' : 'Importar'}
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} disabled={isImporting} />
            </label>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn-polish-primary"
          >
            <Plus size={18} className="inline mr-1" /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
        <input 
          type="text"
          placeholder="Buscar por cliente ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-[#e2e8f0] rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-[#f59e0b] focus:border-[#f59e0b] outline-none shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredContracts.map((contract) => {
          const contractInsts = installments.filter(i => i.contrato_id === contract.id);
          const totalReceived = contractInsts.filter(i => i.status === 'pago').reduce((a, b) => a + b.valor, 0);
          const remaining = contract.valor_total - totalReceived;

          return (
            <div key={contract.id} className="card-polish overflow-hidden flex flex-col hover:border-[#f59e0b]/30 transition-colors">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                      contract.status === 'Fechado' ? 'bg-[#dcfce7] text-[#166534]' : 
                      contract.status === 'Perdido' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#e0f2fe] text-[#0369a1]'
                    }`}>
                      {contract.status}
                    </span>
                    <h3 className="text-lg font-bold text-[#0f172a] mt-2">{contract.cliente_nome}</h3>
                  </div>
                  <p className="text-lg font-extrabold text-[#0f172a]">{formatCurrency(contract.valor_total)}</p>
                </div>

                <div className="space-y-2.5 text-sm text-[#475569] mb-6">
                  <div className="flex items-center gap-2.5 font-medium">
                    <MapPin size={15} className="text-[#94a3b8]"/> {contract.endereco ? `${contract.endereco}, ` : ''}{contract.cidade} {contract.cep ? ` - CEP: ${contract.cep}` : ''}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-[#94a3b8]"/> {contract.telefone} {contract.cpf ? `• CPF: ${contract.cpf}` : ''}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar size={15} className="text-[#94a3b8]"/> Fechado em: {formatDate(contract.data_fechamento)}
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748b] bg-[#f8fafc] px-3 py-2 rounded-lg border border-[#f1f5f9]">
                    {contract.tipo_produto} • {contract.quantidade} pçs • {contract.origem}
                  </div>
                  {contract.condicao_pagamento && (
                    <div className="bg-[#f1f5f9] p-3 rounded-xl border-l-4 border-[#f59e0b] text-[11px]">
                      <p className="font-extrabold text-[#1e293b] uppercase mb-1">Agendamento de Pagamento</p>
                      <p className="text-[#475569] italic">{contract.condicao_pagamento}</p>
                    </div>
                  )}

                  {(contract.representante_nome || contract.comissao_valor) && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-400 border-b border-slate-200 pb-1 uppercase">Representante</span>
                         <button 
                           onClick={() => toggleCommission(contract)}
                           className={cn(
                             "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase transition-all",
                             contract.comissao_paga ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                           )}
                         >
                           {contract.comissao_paga ? "Comissão Paga" : "Comissão Pendente"}
                         </button>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-slate-700">{contract.representante_nome || 'N/A'}</span>
                         <span className="font-extrabold text-[#f59e0b]">{formatCurrency(contract.comissao_valor || 0)}</span>
                       </div>
                    </div>
                  )}

                  {contract.anexos && contract.anexos.length > 0 && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Documentos Anexos</p>
                       <div className="flex flex-wrap gap-2">
                         {contract.anexos.map((anexo: any, idx: number) => (
                           <a key={idx} href={anexo.url} download={anexo.nome} 
                             className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors">
                             <FileText size={12} /> {anexo.nome.length > 15 ? anexo.nome.substring(0, 15) + '...' : anexo.nome}
                           </a>
                         ))}
                       </div>
                    </div>
                  )}
                </div>


                {/* Installments Mini List */}
                <div className="border-t border-gray-50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pagamentos</p>
                    <button 
                      onClick={() => addInstallment(contract.id)}
                      className="text-xs font-bold text-green-600 hover:underline"
                    >
                      + Parcela
                    </button>
                  </div>
                  <div className="space-y-2">
                    {contractInsts.map(inst => (
                      <div key={inst.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs group">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleInstallment(inst)}>
                            {inst.status === 'pago' 
                              ? <CheckCircle2 className="text-green-600" size={16}/> 
                              : <Clock className="text-gray-400" size={16}/>}
                          </button>
                          <span>{formatDate(inst.data_vencimento)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateInstallmentValue(inst.id)}
                            className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity p-1"
                            title="Editar valor"
                          >
                            <Edit2 size={12}/>
                          </button>
                          <span className="font-bold">{formatCurrency(inst.valor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Saldo Restante:</span>
                    <span className="text-red-500">{formatCurrency(remaining)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 flex gap-2 border-t border-gray-100">
                <button 
                  onClick={() => { setSelectedContract(contract); setFormData({...contract}); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-blue-600 font-bold text-xs"
                >
                  <Edit2 size={14}/> Editar
                </button>
                <button 
                  onClick={() => setIsDeleting(contract.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-red-600 font-bold text-xs"
                >
                  <Trash2 size={14}/> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isDeleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">Excluir Contrato?</h4>
            <p className="text-sm text-slate-500 mb-8">Esta ação irá remover permanentemente o contrato e todas as parcelas vinculadas. Não pode ser desfeito.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleting(null)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteContract(isDeleting)}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400">Fechar</button>
            <h3 className="text-xl font-bold mb-6">{selectedContract ? 'Editar Contrato' : 'Cadastrar Contrato'}</h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Cliente</label>
                <input required value={formData.cliente_nome} onChange={e => setFormData({...formData, cliente_nome: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                <input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="000.000.000-00"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Nascimento</label>
                <input type="date" value={formData.data_nascimento} onChange={e => setFormData({...formData, data_nascimento: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                  <input value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="00000-000"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço Completo</label>
                  <input value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="Rua, número, bairro..."/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                <input value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="(00) 00000-0000"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                <input value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Total</label>
                <input type="number" step="0.01" required value={formData.valor_total} onChange={e => setFormData({...formData, valor_total: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fechamento</label>
                <input type="date" required value={formData.data_fechamento} onChange={e => setFormData({...formData, data_fechamento: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Origem</label>
                <select value={formData.origem} onChange={e => setFormData({...formData, origem: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none">
                  <option value="Google">Google</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Representante">Representante</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Produto</label>
                <select value={formData.tipo_produto} onChange={e => setFormData({...formData, tipo_produto: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none">
                  <option value="Porta 35mm">Porta 35mm</option>
                  <option value="Porta 41mm">Porta 41mm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none">
                  <option value="Orçamento">Orçamento</option>
                  <option value="Negociação">Negociação</option>
                  <option value="Fechado">Fechado</option>
                  <option value="Perdido">Perdido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade</label>
                <input type="number" required value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agendamento / Condição de Pagamento</label>
                <input value={formData.condicao_pagamento} onChange={e => setFormData({...formData, condicao_pagamento: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="Ex: Entrada + 3 parcelas de R$ 500,00"/>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h4 className="md:col-span-2 text-[12px] font-bold text-blue-800 uppercase tracking-wider">Informações do Representante</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Representante</label>
                  <input 
                    value={formData.representante_nome} onChange={e => setFormData({...formData, representante_nome: e.target.value})}
                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nome completo"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor da Comissão (R$)</label>
                  <input 
                    type="number" step="0.01" value={formData.comissao_valor} onChange={e => setFormData({...formData, comissao_valor: e.target.value})}
                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0,00"/>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input 
                    type="checkbox" id="comissao_paga" checked={formData.comissao_paga} 
                    onChange={e => setFormData({...formData, comissao_paga: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"/>
                  <label htmlFor="comissao_paga" className="text-sm font-bold text-slate-700 cursor-pointer">Já foi pago ao representante?</label>
                </div>
              </div>
              
              {/* Automated Installment Generation section */}
              {!selectedContract && (
                <div className="md:col-span-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                  <h4 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={16} className="text-[#f59e0b]" /> Planejamento de Recebimento
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor de Entrada</label>
                      <input type="number" step="0.01" value={formData.valor_entrada} onChange={e => setFormData({...formData, valor_entrada: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd. de Parcelas</label>
                      <input type="number" value={formData.num_parcelas} onChange={e => setFormData({...formData, num_parcelas: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b]"/>
                    </div>
                  </div>

                  {plannedInstallments.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento das Parcelas</p>
                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {plannedInstallments.map((inst, index) => (
                          <div key={index} className="flex flex-wrap lg:flex-nowrap items-end gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 capitalize">Parcela {index + 1}</label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={inst.valor} 
                                  onChange={e => {
                                    const newArr = [...plannedInstallments];
                                    newArr[index].valor = parseFloat(e.target.value);
                                    setPlannedInstallments(newArr);
                                  }}
                                  className="w-full text-sm font-bold text-slate-700 outline-none border-b border-transparent focus:border-[#f59e0b]"/>
                              </div>
                            </div>
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">Vencimento</label>
                              <input 
                                type="date"
                                value={inst.data_vencimento}
                                onChange={e => {
                                  const newArr = [...plannedInstallments];
                                  newArr[index].data_vencimento = e.target.value;
                                  setPlannedInstallments(newArr);
                                }}
                                className="w-full text-xs font-medium text-slate-600 outline-none"/>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const newArr = [...plannedInstallments];
                                newArr[index].status = newArr[index].status === 'pago' ? 'pendente' : 'pago';
                                setPlannedInstallments(newArr);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-colors border",
                                inst.status === 'pago' 
                                  ? "bg-green-50 border-green-200 text-green-600" 
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                              )}
                              title={inst.status === 'pago' ? "Marcar como Em Aberto" : "Marcar como Pago"}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
                <textarea rows={3} value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"/>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documentos / Anexos</label>
                <div className="mt-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-all",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}>
                      <Plus size={16} /> {isUploading ? 'Processando...' : 'Adicionar Documento'}
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.doc,.docx,image/*"/>
                    </label>
                    <p className="text-[10px] text-slate-400 italic">Máximo 500KB por arquivo.</p>
                  </div>

                  {formData.anexos && formData.anexos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formData.anexos.map((anexo: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip size={14} className="text-[#f59e0b] flex-shrink-0" />
                            <span className="text-xs text-slate-600 font-medium truncate">{anexo.nome}</span>
                          </div>
                          <button type="button" onClick={() => removeAnexo(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <XCircle size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isSaving}
                className={cn(
                  "md:col-span-2 py-4 rounded-xl text-white font-bold shadow-lg mt-4 transition-all",
                  isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-[#0f172a] hover:brightness-110 active:scale-[0.98]"
                )}
              >
                {isSaving ? 'Processando...' : selectedContract ? 'Salvar Alterações' : 'Cadastrar Contrato'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
