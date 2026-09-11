import React from 'react';
import { Sliders, CheckSquare, Square, Info } from 'lucide-react';
import { FlashOptions } from '../../shared/types';

interface PartitionConfigProps {
  options: FlashOptions;
  setOptions: React.Dispatch<React.SetStateAction<FlashOptions>>;
  disabled: boolean;
}

export const PartitionConfig: React.FC<PartitionConfigProps> = ({
  options,
  setOptions,
  disabled,
}) => {
  const handleSchemeChange = (scheme: 'MBR' | 'GPT') => {
    setOptions((prev) => ({
      ...prev,
      partitionScheme: scheme,
      targetSystem: scheme === 'MBR' ? 'BIOS' : 'UEFI',
    }));
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Partition Scheme & Format Options</span>
        </label>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Rufus Parity
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Partition Scheme */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase">
            Partition Scheme
          </label>
          <select
            disabled={disabled}
            value={options.partitionScheme}
            onChange={(e) => handleSchemeChange(e.target.value as 'MBR' | 'GPT')}
            className="w-full bg-[#090d16] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
          >
            <option value="MBR">MBR (Legacy / BIOS & UEFI-CSM)</option>
            <option value="GPT">GPT (Modern UEFI non-CSM)</option>
          </select>
        </div>

        {/* Target System */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase">
            Target System
          </label>
          <select
            disabled={disabled}
            value={options.targetSystem}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                targetSystem: e.target.value as 'BIOS' | 'UEFI',
              }))
            }
            className="w-full bg-[#090d16] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
          >
            {options.partitionScheme === 'MBR' ? (
              <>
                <option value="BIOS">BIOS (or UEFI-CSM)</option>
                <option value="UEFI">UEFI (CSM hybrid)</option>
              </>
            ) : (
              <option value="UEFI">UEFI (non CSM)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* File System */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase">
            File System
          </label>
          <select
            disabled={disabled}
            value={options.fileSystem}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                fileSystem: e.target.value as any,
              }))
            }
            className="w-full bg-[#090d16] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
          >
            <option value="FAT32">FAT32 (Default bootable)</option>
            <option value="NTFS">NTFS (Windows &gt; 4GB wim)</option>
            <option value="exFAT">exFAT (Large storage)</option>
            <option value="RAW_DD">RAW DD Mode (1:1 Bitstream)</option>
          </select>
        </div>

        {/* Cluster Size */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase">
            Cluster Size
          </label>
          <select
            disabled={disabled}
            value={options.clusterSize}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                clusterSize: Number(e.target.value),
              }))
            }
            className="w-full bg-[#090d16] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
          >
            <option value={4096}>4096 bytes (Default)</option>
            <option value={8192}>8192 bytes</option>
            <option value={16384}>16 kilobytes</option>
            <option value={32768}>32 kilobytes</option>
            <option value={65536}>64 kilobytes</option>
          </select>
        </div>
      </div>

      {/* Volume Label Input */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-400 uppercase">
          Volume Label
        </label>
        <input
          type="text"
          disabled={disabled}
          maxLength={32}
          value={options.volumeLabel}
          onChange={(e) =>
            setOptions((prev) => ({
              ...prev,
              volumeLabel: e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''),
            }))
          }
          placeholder="BOOTABLE_USB"
          className="w-full bg-[#090d16] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50 tracking-wider uppercase"
        />
      </div>

      {/* Checkbox Options */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setOptions((prev) => ({ ...prev, quickFormat: !prev.quickFormat }))
          }
          className="flex items-center gap-1.5 text-slate-300 hover:text-slate-100 disabled:opacity-50"
        >
          {options.quickFormat ? (
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Square className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>Quick Format</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setOptions((prev) => ({
              ...prev,
              verifyAfterWrite: !prev.verifyAfterWrite,
            }))
          }
          className="flex items-center gap-1.5 text-slate-300 hover:text-slate-100 disabled:opacity-50"
        >
          {options.verifyAfterWrite ? (
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Square className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>Verify Disk After Write</span>
        </button>
      </div>
    </div>
  );
};
