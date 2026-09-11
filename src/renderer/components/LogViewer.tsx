import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { LogEntry } from '../../shared/types';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-cyan-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400 font-bold';
      case 'success':
        return 'text-emerald-400 font-semibold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden flex flex-col transition-all duration-200">
      {/* Drawer Header */}
      <div className="bg-[#111726] px-3 py-2 border-b border-slate-800/80 flex items-center justify-between select-none">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 hover:text-white"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Execution Log Console ({logs.length})</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            title="Copy Logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Log Output */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="h-44 p-2.5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 bg-[#06080e] select-text"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No events logged yet. Ready.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 hover:bg-white/[0.02] px-1 rounded">
                <span className="text-slate-500 select-none flex-shrink-0">{log.timestamp}</span>
                <span className={`uppercase font-bold select-none flex-shrink-0 ${getLevelColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
