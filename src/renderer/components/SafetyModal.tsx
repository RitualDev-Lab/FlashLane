import React from 'react';
import { AlertOctagon, Check, X, ShieldAlert } from 'lucide-react';
import { UsbDrive, ImageMetadata, FlashOptions } from '../../shared/types';

interface SafetyModalProps {
  isOpen: boolean;
  drive: UsbDrive | null;
  image: ImageMetadata | null;
  options: FlashOptions;
  onConfirm: () => void;
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({
  isOpen,
  drive,
  image,
  options,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || !drive || !image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-red-500/40 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
            <AlertOctagon className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {options.isSimulation ? 'Start Simulated Flash Run?' : 'WARNING: ALL DATA WILL BE WIPED'}
            </h3>
            <p className="text-xs text-slate-400">
              {options.isSimulation
                ? 'Safe dry-run simulation mode is active.'
                : 'Permanent, unrecoverable data erasure warning.'}
            </p>
          </div>
        </div>

        <div className="bg-[#090d16] border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between border-b border-slate-800/80 pb-1">
            <span className="text-slate-400">TARGET DRIVE:</span>
            <span className="text-cyan-400 font-bold">{drive.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1">
            <span className="text-slate-400">CAPACITY / PATH:</span>
            <span className="text-slate-200">
              {drive.sizeFormatted} ({drive.devicePath})
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1">
            <span className="text-slate-400">SOURCE IMAGE:</span>
            <span className="text-slate-200 truncate max-w-[200px]">{image.fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SCHEME / TARGET:</span>
            <span className="text-slate-200">
              {options.partitionScheme} / {options.targetSystem} ({options.fileSystem})
            </span>
          </div>
        </div>

        {!options.isSimulation && (
          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <p>
              All existing files and partitions on <strong>{drive.name}</strong> will be destroyed.
              Please ensure you have backed up any necessary files before proceeding.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all flex items-center gap-1.5 ${
              options.isSimulation
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{options.isSimulation ? 'Run Simulation' : 'I Understand, Erase & Write'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
