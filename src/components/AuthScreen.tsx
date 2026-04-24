import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-10 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl mb-6">
          <ShieldAlert size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-none mb-2">
          ACESSO RESTRITO<span className="text-[#f59e0b]">.</span>
        </h1>
        
        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
          Este sistema é privado. Para acessar o painel de controle, você deve utilizar o seu 
          <span className="text-amber-600 font-bold"> Link Mestre Autorizado.</span>
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-3">
            <Lock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Segurança Turen</span>
          </div>
          <p className="text-[11px] text-slate-400 font-bold">
            Se você perdeu seu link de acesso, entre em contato com o administrador do sistema.
          </p>
        </div>

        <div className="mt-10">
          <div className="flex flex-col items-center">
            <span className="font-black text-xl text-slate-300 tracking-tighter leading-none">
              TUREN<span className="text-[#f59e0b] opacity-50">.</span>
            </span>
            <span className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">
              Controle Financeiro
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
