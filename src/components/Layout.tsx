import { ReactNode } from 'react';
import { Settings, Briefcase, GitPullRequest, PanelBottom, PanelRight, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: ReactNode }) {
  const { activeTab, setActiveTab, holdedUserId } = useAppContext();

  const isConfigured = Boolean(holdedUserId);

  const navItems = [
    { id: 'crm', label: 'CRM', icon: GitPullRequest },
    { id: 'projects', label: 'Proyectos', icon: Briefcase },
  ] as const;

  const setPanelMode = (mode: 'bottom' | 'right') => {
    window.parent.postMessage({ action: 'setPanelMode', mode }, '*');
  };

  return (
    <div className="flex flex-col h-full bg-white w-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1a73e8] rounded flex items-center justify-center text-white font-bold text-xl">H</div>
          <h1 className="text-[#3c4043] font-google font-medium text-lg tracking-tight">Holded Sync</h1>
        </div>
        <div className="flex gap-1 items-center">
          <button 
            onClick={() => setPanelMode('bottom')}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hidden sm:block"
            title="Acoplar abajo"
          >
            <PanelBottom size={18} />
          </button>
          <button 
            onClick={() => setPanelMode('right')}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hidden sm:block mr-2"
            title="Acoplar a la derecha"
          >
            <PanelRight size={18} />
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "p-2 rounded-full transition-colors hover:bg-gray-100",
              activeTab === 'settings' ? "text-[#1a73e8] bg-blue-50" : "text-gray-500"
            )}
            title="Ajustes"
          >
            <Settings size={20} />
          </button>
          
          <button 
            onClick={() => window.parent.postMessage({ action: 'closePanel' }, '*')}
            className="p-2 rounded-full transition-colors hover:bg-red-50 text-gray-500 hover:text-red-500 ml-1"
            title="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#f8f9fa] relative">
        {children}
      </main>

      {/* Bottom Nav */}
      {isConfigured && (
        <nav className="flex bg-white border-t border-gray-200 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors",
                  isActive ? "text-[#1a73e8]" : "text-[#5f6368] hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "px-4 py-1 rounded-full mb-1 transition-all",
                  isActive ? "bg-blue-100" : ""
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[11px] font-medium font-google">{item.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  );
}
