import React, { useEffect, useRef } from 'react';
import { AnalysisLogEntry } from '../types';

interface AnalysisLogProps {
  logs: AnalysisLogEntry[];
  isActive: boolean;
}

export const AnalysisLog: React.FC<AnalysisLogProps> = ({ logs, isActive }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isActive) return null;

  return (
    <div className="bg-slate-900/80 border border-mycelium-800 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs shadow-inner shadow-black/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-900/90 pb-2 border-b border-mycelium-900">
        <div className="w-2 h-2 rounded-full bg-mycelium-500 animate-pulse"></div>
        <span className="text-mycelium-400 font-bold tracking-wider">ENGINE LOG</span>
      </div>
      <div className="space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 animate-slide-in">
            <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit' })}]</span>
            <span className={`
              ${log.type === 'info' ? 'text-slate-300' : ''}
              ${log.type === 'success' ? 'text-mycelium-400' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'pattern' ? 'text-spore-400' : ''}
            `}>
              {log.type === 'pattern' ? '> ' : ''}{log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};