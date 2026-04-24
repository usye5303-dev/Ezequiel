import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { useAuth } from './useAuth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';

export interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  info?: string;
  date: string;
  priority: 'Urgente' | 'Hoje' | 'Pendente';
}

export function useAlerts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [readAlerts, setReadAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem('readAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('readAlerts', JSON.stringify(readAlerts));
  }, [readAlerts]);

  useEffect(() => {
    localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  useEffect(() => {
    if (!user) return;
    const qC = query(collection(db, 'contracts'), where('userId', '==', user.uid));
    const qI = query(collection(db, 'installments'), where('userId', '==', user.uid));

    const unsubC = onSnapshot(qC, (snap) => setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubI = onSnapshot(qI, (snap) => {
      setInstallments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubC(); unsubI(); };
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const rawAlerts: Alert[] = [
    ...installments
      .filter(i => i.status === 'pendente' && i.data_vencimento < today)
      .map(i => {
        const contract = contracts.find(c => c.id === i.contrato_id);
        return {
          id: `late-${i.id}`,
          type: 'danger' as const,
          title: 'Parcela Atrasada',
          message: `${contract?.cliente_nome || 'Cliente'}: ${formatCurrency(i.valor)}`,
          info: contract ? `${contract.cidade} - ${contract.telefone}` : '',
          date: i.data_vencimento,
          priority: 'Urgente' as const
        };
      }),
    ...installments
      .filter(i => i.status === 'pendente' && i.data_vencimento === today)
      .map(i => {
        const contract = contracts.find(c => c.id === i.contrato_id);
        return {
          id: `today-${i.id}`,
          type: 'warning' as const,
          title: 'Vencendo Hoje',
          message: `${contract?.cliente_nome || 'Cliente'}: ${formatCurrency(i.valor)}`,
          info: contract ? `${contract.cidade} - Tel: ${contract.telefone}` : '',
          date: i.data_vencimento,
          priority: 'Hoje' as const
        };
      }),
    ...contracts
      .filter(c => c.status === 'Orçamento' && c.data_fechamento <= sevenDaysAgoStr)
      .map(c => ({
        id: `stale-${c.id}`,
        type: 'info' as const,
        title: 'Orçamento Parado',
        message: `${c.cliente_nome}: Sem retorno há mais de 7 dias`,
        info: `${c.cidade} - ${c.quantidade} unidades - ${c.telefone}`,
        date: c.data_fechamento,
        priority: 'Pendente' as const
      }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const alerts = rawAlerts.filter(a => !dismissedAlerts.includes(a.id));
  const unreadCount = alerts.filter(a => !readAlerts.includes(a.id)).length;

  const toggleRead = (id: string) => {
    setReadAlerts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  return {
    alerts,
    unreadCount,
    readAlerts,
    toggleRead,
    dismissAlert,
    loading
  };
}
