import React from 'react';
import { HardDrive, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { UsbDrive } from '../../shared/types';

interface DriveSelectorProps {
  drives: UsbDrive[];
  selectedDriveId: string;
  onSelectDrive: (driveId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const DriveSelector: React.FC<DriveSelectorProps> = ({
  drives,
  selectedDriveId,
  onSelectDrive,
  onRefresh,
  isLoading,
  disabled,
}) => {
  const selectedDrive = drives.find((d) => d.id === selectedDriveId);

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span>Device / Target Drive</span>
        </label>
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={onRefresh}
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Rescan connected USB drives"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Scan</span>
        </button>
      </div>

      <div className="relative">
        <select
          value={selectedDriveId}
          disabled={disabled || drives.length === 0}
          onChange={(e) => onSelectDrive(e.target.value)}
          className="w-full bg-[#090d16] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 appearance-none font-medium cursor-pointer"
        >
          {drives.length === 0 ? (
            <option value="">No USB drive detected - Click Scan</option>
          ) : (
            drives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.name} ({drive.sizeFormatted}) [{drive.devicePath}]
              </option>
            ))
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Selected Drive Details Chip */}
      {selectedDrive && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
            Size: <strong className="text-cyan-400">{selectedDrive.sizeFormatted}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
            Path: <strong className="text-slate-200">{selectedDrive.devicePath}</strong>
          </span>
          {selectedDrive.id === 'virtual-sim-drive' ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Safe Simulator Drive
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Hardware Drive
            </span>
          )}
        </div>
      )}

      {selectedDrive?.isSystemDrive && (
        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>LOCKED: System OS disk detected. Writes to this target are strictly disabled.</span>
        </div>
      )}
    </div>
  );
};
