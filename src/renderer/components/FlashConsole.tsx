import React from 'react';
import { Play, XOctagon, CheckCircle2, AlertTriangle, Zap, Clock, Activity } from 'lucide-react';
import { FlashProgress, FlashResult } from '../../shared/types';

interface FlashConsoleProps {
  isFlashing: boolean;
  progress: FlashProgress | null;
  lastResult: FlashResult | null;
  canStart: boolean;
  isSimulation: boolean;
  onStartFlash: () => void;
  onCancelFlash: () => void;
  onReset: () => void;
}

export const FlashConsole: React.FC<FlashConsoleProps> = ({
  isFlashing,
  progress,
  lastResult,
  canStart,
  isSimulation,
  onStartFlash,
  onCancelFlash,
  onReset,
}) => {
  const formatETA = (seconds: number) => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPhaseBadgeColor = (phase?: string) => {
    switch (phase) {
      case 'writing':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'verifying':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'cancelled':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 space-y-3">
      {/* Operation Status & Live Telemetry Header */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPhaseBadgeColor(
              progress?.phase
            )}`}
          >
            {progress?.phase || 'READY'}
          </span>
          <span className="text-slate-300 truncate max-w-[260px]">
            {progress?.currentTask || (isFlashing ? 'Processing...' : 'Ready for write operation')}
          </span>
        </div>

        <span className="text-cyan-400 font-bold text-sm">
          {progress?.percentage !== undefined ? `${progress.percentage.toFixed(1)}%` : '0.0%'}
        </span>
      </div>

      {/* Progress Bar with Metallic Bevel */}
      <div className="relative w-full h-4 bg-[#090d16] rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress?.phase === 'completed'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 glow-emerald'
              : progress?.phase === 'verifying'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-400'
              : progress?.phase === 'error'
              ? 'bg-gradient-to-r from-red-600 to-rose-500'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 progress-striped glow-cyan'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress?.percentage || 0))}%` }}
        />
      </div>

      {/* Speed & ETA Telemetry Cards */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-1.5 rounded bg-[#090d16] border border-slate-800">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>WRITE SPEED</span>
          </div>
          <div className="text-xs font-bold text-slate-200 mt-0.5">
            {progress?.speedMBs !== undefined ? `${progress.speedMBs.toFixed(1)} MB/s` : '0.0 MB/s'}
          </div>
        </div>

        <div className="p-1.5 rounded bg-[#090d16] border border-slate-800">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>ETA</span>
          </div>
          <div className="text-xs font-bold text-slate-200 mt-0.5">
            {formatETA(progress?.etaSeconds || 0)}
          </div>
        </div>

        <div className="p-1.5 rounded bg-[#090d16] border border-slate-800">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>WRITTEN</span>
          </div>
          <div className="text-[11px] font-bold text-slate-200 mt-0.5 truncate px-1">
            {formatBytes(progress?.bytesWritten || 0)}
          </div>
        </div>
      </div>

      {/* Result Alert if Done */}
      {lastResult && !isFlashing && (
        <div
          className={`p-2.5 rounded text-xs flex items-center justify-between ${
            lastResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>
              {lastResult.success
                ? `Write completed in ${lastResult.durationSeconds.toFixed(1)}s (Avg ${lastResult.averageSpeedMBs.toFixed(1)} MB/s)${
                    lastResult.checksumVerified ? ' • SHA-256 Verified' : ''
                  }`
                : `Failed: ${lastResult.error || 'Unknown write error'}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-mono underline hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <div>
        {isFlashing ? (
          <button
            type="button"
            onClick={onCancelFlash}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold uppercase tracking-widest text-xs rounded-md shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <XOctagon className="w-4 h-4" />
            <span>Abort Flashing Task</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!canStart}
            onClick={onStartFlash}
            className={`w-full py-2.5 font-bold uppercase tracking-widest text-xs rounded-md shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
              canStart
                ? isSimulation
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isSimulation ? 'Start Flashing [Simulation Mode]' : 'Start Writing Bootable USB'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
