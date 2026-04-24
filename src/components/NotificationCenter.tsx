import React, { useState } from 'react';
import { useAlerts, Alert } from '../hooks/useAlerts';
import { Bell, AlertCircle, Clock, Calendar, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationCenter() {
  const { alerts, unreadCount, readAlerts, toggleRead, dismissAlert } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'danger': return <AlertCircle size={16} />;
      case 'warning': return <Calendar size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Alertas e Pendências</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{unreadCount} novos</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={24} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Tudo em dia por aqui!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {alerts.map((alert) => {
                      const isRead = readAlerts.includes(alert.id);
                      return (
                        <div key={alert.id} className={cn(
                          "p-4 hover:bg-slate-50 transition-colors cursor-default relative group",
                          isRead && "opacity-60"
                        )}>
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              alert.type === 'danger' ? "bg-red-50 text-red-500" :
                              alert.type === 'warning' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                            )}>
                              {getIcon(alert.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <p className="text-xs font-bold text-slate-800 mb-0.5">{alert.title}</p>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleRead(alert.id); }}
                                    title={isRead ? "Marcar como não lido" : "Marcar como lido"}
                                    className="p-1 hover:bg-white rounded border border-slate-100 text-slate-400 hover:text-green-600 shadow-sm"
                                  >
                                    {isRead ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                                    title="Remover alerta"
                                    className="p-1 hover:bg-white rounded border border-slate-100 text-slate-400 hover:text-red-500 shadow-sm"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed font-bold">{alert.message}</p>
                              {alert.info && <p className="text-[10px] text-slate-400 italic mt-0.5">{alert.info}</p>}
                              <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">{alert.date}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
