import React from 'react';
import { Minus, Square, X, HardDrive, ShieldCheck, HelpCircle, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  isSimulation: boolean;
  setIsSimulation: (val: boolean) => void;
  isFlashing: boolean;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSimulation,
  setIsSimulation,
  isFlashing,
  onOpenHelp,
}) => {
  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <header className="titlebar-drag h-12 bg-[#0d1322] border-b border-slate-800/80 flex items-center justify-between px-3 select-none flex-shrink-0">
      {/* Brand & App Icon */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
          <HardDrive className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold tracking-wider text-sm text-slate-100 uppercase">
            FLASH<span className="text-cyan-400">LANE</span>
          </span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Center Mode Controls & Safety Toggle */}
      <div className="titlebar-no-drag flex items-center gap-2">
        <button
          type="button"
          disabled={isFlashing}
          onClick={() => setIsSimulation(!isSimulation)}
          className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all duration-200 border ${
            isSimulation
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-sm shadow-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20'
          } ${isFlashing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isSimulation ? 'Simulation Mode Active: Hardware writes are safely bypassed' : 'Physical Hardware Flashing Active'}
        >
          {isSimulation ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>SIMULATION</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>PHYSICAL WRITE</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Rufus & USB Writer Help Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Window Controls */}
      <div className="titlebar-no-drag flex items-center">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/90 rounded transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
