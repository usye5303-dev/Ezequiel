import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import FinanceView from './components/FinanceView';
import ContractsView from './components/ContractsView';
import FluxoCaixaView from './components/FluxoCaixaView';
import DREView from './components/DREView';
import AnalyticsView from './components/AnalyticsView';
import FixedExpensesView from './components/FixedExpensesView';
import NotificationCenter from './components/NotificationCenter';
import AuthScreen from './components/AuthScreen';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'finance' | 'contracts' | 'cashflow' | 'dre' | 'analytics' | 'fixed_expenses';

export default function App() {
  const { user, loading, isAutologgingIn, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (loading || isAutologgingIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f59e0b] mb-4"></div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">
            {isAutologgingIn ? 'Acessando via Link Pro...' : 'Iniciando Sistema...'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
            {isAutologgingIn 
              ? 'Validando sua chave de acesso. Aguarde um momento.' 
              : 'Se for o primeiro acesso após algum tempo, o servidor pode levar alguns segundos para "acordar".'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'finance': return <FinanceView />;
      case 'contracts': return <ContractsView />;
      case 'cashflow': return <FluxoCaixaView />;
      case 'dre': return <DREView />;
      case 'analytics': return <AnalyticsView />;
      case 'fixed_expenses': return <FixedExpensesView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 lg:pb-0 lg:pl-[240px]">
      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 right-0 left-[240px] h-14 bg-white border-bottom border-[#e2e8f0] px-6 items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-[#64748b] font-medium">Gestão Financeira & Comercial</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
              {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : user.email?.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-700">{user.displayName || user.email}</span>
          </div>
          <button 
            onClick={logout}
            className="text-xs text-slate-400 hover:text-red-500 font-bold uppercase transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#0f172a] flex-col z-20">
        <div className="p-6">
          <div className="flex flex-col">
            <span className="font-black text-2xl text-white tracking-tighter leading-none">
              TUREN<span className="text-[#f59e0b]">.</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 ml-0.5">
              Controle Financeiro
            </span>
          </div>
        </div>
        
        <div className="flex-1 px-0 py-4">
          <Navigation currentView={currentView} setView={setCurrentView} desktop />
        </div>
        
        <div className="p-6 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          © 2026 Turen Sistemas
        </div>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col">
          <span className="font-black text-xl text-[#0f172a] tracking-tighter leading-none">
            TUREN<span className="text-[#f59e0b]">.</span>
          </span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
            Controle Financeiro
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          {user.photoURL ? (
            <img src={user.photoURL} className="w-8 h-8 rounded-full border border-gray-100" alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-gray-100 uppercase">
              {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : user.email?.substring(0, 2)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 lg:p-10 lg:mt-14">

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Navigation currentView={currentView} setView={setCurrentView} />
      </div>
    </div>
  );
}

