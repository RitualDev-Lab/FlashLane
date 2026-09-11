import React, { useState } from 'react';
import { Disc, FileSearch, Hash, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';
import { ImageMetadata } from '../../shared/types';

interface ImageSelectorProps {
  imageMetadata: ImageMetadata | null;
  onSelectImage: () => void;
  disabled: boolean;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  imageMetadata,
  onSelectImage,
  disabled,
}) => {
  const [checksum, setChecksum] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [hashProgress, setHashProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCalculateHash = async () => {
    if (!imageMetadata?.filePath || isHashing) return;
    setIsHashing(true);
    setHashProgress(0);

    const cleanup = window.electronAPI?.onChecksumProgress((p) => {
      setHashProgress(p);
    });

    try {
      const hash = await window.electronAPI?.checksumImage({
        filePath: imageMetadata.filePath,
        algorithm: 'sha256',
      });
      setChecksum(hash);
    } catch (err) {
      console.error('Hash calculation failed', err);
    } finally {
      setIsHashing(false);
      cleanup?.();
    }
  };

  const handleCopyHash = () => {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Disc className="w-3.5 h-3.5 text-cyan-400" />
          <span>Boot Selection / ISO Image</span>
        </label>
        {imageMetadata && (
          <span className="text-[11px] font-mono text-cyan-400 font-medium">
            {imageMetadata.fileSizeFormatted}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            readOnly
            value={imageMetadata ? imageMetadata.fileName : ''}
            placeholder="No ISO / IMG image selected"
            className="w-full bg-[#090d16] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelectImage}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md shadow-cyan-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>
      </div>

      {/* Image Inspection Insights */}
      {imageMetadata && (
        <div className="pt-1.5 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded bg-[#090d16] border border-slate-800 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <div className="overflow-hidden">
                <div className="text-[10px] text-slate-400 uppercase">Detected OS</div>
                <div className="text-slate-200 font-semibold truncate">
                  {imageMetadata.osLabel || 'Standard ISO 9660'}
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-[#090d16] border border-slate-800 flex items-center gap-2">
              {imageMetadata.isBootable ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              )}
              <div className="overflow-hidden">
                <div className="text-[10px] text-slate-400 uppercase">Boot Mode</div>
                <div className="text-slate-200 font-semibold truncate capitalize">
                  {imageMetadata.bootType.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Hash Verification Bar */}
          <div className="p-2 rounded bg-[#090d16] border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">SHA-256:</span>
              <span className="text-[10px] font-mono text-slate-300 truncate">
                {checksum ? checksum : isHashing ? `Hashing... ${hashProgress}%` : 'Not computed'}
              </span>
            </div>

            {checksum ? (
              <button
                type="button"
                onClick={handleCopyHash}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex-shrink-0 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            ) : (
              <button
                type="button"
                disabled={isHashing}
                onClick={handleCalculateHash}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex-shrink-0 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700 disabled:opacity-50"
              >
                {isHashing ? `${hashProgress}%` : 'Verify Hash'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
