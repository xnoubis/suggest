import React from 'react';
import { Suggestion, SuggestionType } from '../types';
import { 
  MagnifyingGlassIcon, 
  BookOpenIcon, 
  WrenchScrewdriverIcon, 
  LinkIcon, 
  BoltIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
  disabled: boolean;
}

const getIcon = (type: SuggestionType) => {
  switch (type) {
    case 'Clarify': return <MagnifyingGlassIcon className="w-5 h-5" />;
    case 'Expand': return <BookOpenIcon className="w-5 h-5" />;
    case 'Create': return <WrenchScrewdriverIcon className="w-5 h-5" />;
    case 'Connect': return <LinkIcon className="w-5 h-5" />;
    case 'Challenge': return <BoltIcon className="w-5 h-5" />;
    case 'Crystallize': return <SparklesIcon className="w-5 h-5" />;
  }
};

const getColor = (type: SuggestionType) => {
  switch (type) {
    case 'Clarify': return 'text-blue-400 border-blue-900/50 hover:bg-blue-900/20';
    case 'Expand': return 'text-green-400 border-green-900/50 hover:bg-green-900/20';
    case 'Create': return 'text-amber-400 border-amber-900/50 hover:bg-amber-900/20';
    case 'Connect': return 'text-purple-400 border-purple-900/50 hover:bg-purple-900/20';
    case 'Challenge': return 'text-red-400 border-red-900/50 hover:bg-red-900/20';
    case 'Crystallize': return 'text-cyan-400 border-cyan-900/50 hover:bg-cyan-900/20';
  }
};

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onClick, disabled }) => {
  const colorClass = getColor(suggestion.type);

  return (
    <button
      onClick={() => onClick(suggestion)}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-lg border transition-all duration-200 group
        ${colorClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
        bg-slate-900/50 backdrop-blur-sm
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-md bg-slate-950/50 group-hover:bg-slate-950/80 transition-colors`}>
          {getIcon(suggestion.type)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h4 className="font-bold text-sm tracking-wide uppercase opacity-90">{suggestion.type}</h4>
            <span className="text-[10px] font-mono opacity-60 bg-slate-950 px-1.5 py-0.5 rounded">
              {(suggestion.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="font-semibold text-slate-200 text-sm mb-1">{suggestion.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{suggestion.description}</p>
          
          {/* Tooltip-like reasoning that appears on deeper interaction could go here, for now simpler */}
          <div className="mt-2 pt-2 border-t border-white/5 hidden group-hover:block animate-fade-in">
             <p className="text-[10px] font-mono text-slate-500">
               <span className="text-slate-400">LOGIC:</span> {suggestion.reasoning}
             </p>
          </div>
        </div>
      </div>
    </button>
  );
};