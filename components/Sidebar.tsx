
import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  GitBranch, 
  Wallet, 
  Settings as SettingsIcon,
  ChevronRight,
  Receipt,
  ScanLine
} from 'lucide-react';
import { Module } from '../types';
import { LOGO_DARK_BG } from '../constants';

interface SidebarProps {
  activeModule: Module;
  onModuleChange: (module: Module) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange }) => {
  const menuItems = [
    { id: 'Dashboard' as Module, icon: LayoutDashboard, label: 'Dashboards' },
    { id: 'Invoices' as Module, icon: FileText, label: 'Create Invoice' },
    { id: 'Payments' as Module, icon: Receipt, label: 'Payment Receipt' },
    { id: 'Clients' as Module, icon: Users, label: 'Clients' },
    { id: 'Branches' as Module, icon: GitBranch, label: 'Branches' },
    { id: 'Accounts' as Module, icon: Wallet, label: 'Financial Ledger' },
    { id: 'Scanner' as Module, icon: ScanLine, label: 'Secure Scanner' },
    { id: 'Settings' as Module, icon: SettingsIcon, label: 'System Config' },
  ];

  return (
    <div className="w-64 bg-[#1c2d3d] text-white h-screen flex flex-col shadow-2xl flex-shrink-0 border-r border-black/10">
      <div className="p-6 border-b border-white/5 bg-[#14212c] flex flex-col items-center">
        <img src={LOGO_DARK_BG} alt="VEDARTHA" className="h-14 object-contain" />
      </div>
      
      <nav className="flex-1 mt-6 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={`w-full flex items-center px-6 py-4 transition-all duration-300 group relative ${
              activeModule === item.id 
                ? 'bg-[#0854a0] text-white' 
                : 'text-gray-400 hover:bg-[#2c3e50] hover:text-white'
            }`}
          >
            {activeModule === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>}
            <item.icon size={18} className={`${activeModule === item.id ? 'text-blue-300' : 'text-gray-500 group-hover:text-blue-400'} transition-colors`} />
            <span className="ml-4 font-semibold text-[13px]">{item.label}</span>
            {activeModule === item.id && <ChevronRight size={14} className="ml-auto opacity-40" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 bg-[#14212c]">
        <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="w-9 h-9 rounded-lg bg-[#0854a0] flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-black/20">
            AL
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[11px] font-bold truncate">Administrator</p>
            <p className="text-[9px] text-blue-400 font-medium opacity-60">System Master</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
