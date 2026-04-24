import { 
  LayoutDashboard, 
  Wallet, 
  FileText, 
  ArrowLeftRight, 
  BarChart3, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationProps {
  currentView: string;
  setView: (view: any) => void;
  desktop?: boolean;
}

export default function Navigation({ currentView, setView, desktop }: NavigationProps) {
  const items = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'finance', label: 'Financeiro', icon: Wallet },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'fixed_expenses', label: 'Fixas', icon: Calendar },
    { id: 'cashflow', label: 'Fluxo', icon: ArrowLeftRight },
    { id: 'dre', label: 'DRE', icon: BarChart3 },
    { id: 'analytics', label: 'Análises', icon: TrendingUp },
  ];

  if (desktop) {
    return (
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-3.5 transition-all duration-200 text-[14px]",
                isActive 
                  ? "bg-[#1e293b] text-white border-l-4 border-[#f59e0b]" 
                  : "text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white border-l-4 border-transparent"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-[#f59e0b]" : "text-[#94a3b8]")} />
              <span className="font-medium">{item.label === 'Início' ? 'Dashboard' : item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex justify-around items-center h-16">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-1 transition-colors duration-200",
              isActive ? "text-[#f59e0b]" : "text-slate-400"
            )}
          >
            <Icon size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

