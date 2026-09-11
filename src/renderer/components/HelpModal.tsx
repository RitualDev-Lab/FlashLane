import React from 'react';
import { X, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-cyan-500/40 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              USB Writer - Quick Help & Rufus Guide
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <div>
            <h4 className="font-bold text-cyan-400 mb-1">1. Partition Schemes (MBR vs GPT)</h4>
            <p className="text-slate-400">
              - <strong>GPT (GUID Partition Table):</strong> Standard for modern systems with UEFI (Windows 11, recent Ubuntu, Arch). Required for disks larger than 2TB.
              <br />
              - <strong>MBR (Master Boot Record):</strong> Standard for older computers with legacy BIOS or UEFI-CSM mode.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-cyan-400 mb-1">2. File System Selection</h4>
            <p className="text-slate-400">
              - <strong>FAT32:</strong> Maximum UEFI firmware compatibility, but has a 4GB file size limit.
              <br />
              - <strong>NTFS:</strong> Best for modern Windows install images with huge <code className="text-cyan-300">install.wim</code> files (&gt;4GB).
              <br />
              - <strong>RAW DD:</strong> Bit-for-bit exact copy, perfect for hybrid Linux ISOs like Arch, Tails, and Proxmox.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-cyan-400 mb-1">3. Simulation Mode</h4>
            <p className="text-slate-400">
              Allows you to safely test the complete ISO parsing, flashing telemetry, checksum calculation, and status progression without writing any physical sectors to disk.
            </p>
          </div>

          <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Built-in system drive lock prevents accidental overwriting of OS boot drives (e.g. C:\).</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
