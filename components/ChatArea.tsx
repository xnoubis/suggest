import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { UserCircleIcon, CpuChipIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

interface ChatAreaProps {
  messages: Message[];
  isTyping: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isTyping }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
          <CpuChipIcon className="w-16 h-16 opacity-20" />
          <p className="text-center max-w-md">
            The Mycelial Engine is dormant. <br/>
            Initialize conversation to activate the substrate.
          </p>
        </div>
      )}
      
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role !== 'user' && (
            <div className="w-8 h-8 rounded-full bg-mycelium-900 flex items-center justify-center shrink-0 border border-mycelium-700">
              <CpuChipIcon className="w-5 h-5 text-mycelium-400" />
            </div>
          )}
          
          <div className={`
            max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-lg
            ${msg.role === 'user' 
              ? 'bg-slate-700 text-white rounded-br-none' 
              : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}
          `}>
             <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
             </div>
             {msg.metadata?.suggestionType && (
               <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                 <span className="text-[10px] uppercase tracking-wider font-bold text-mycelium-400">
                   Executed: {msg.metadata.suggestionType}
                 </span>
                 {msg.metadata.modelUsed && (
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">
                      Model: {msg.metadata.modelUsed}
                    </span>
                 )}
               </div>
             )}
          </div>

          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 border border-indigo-700">
              <UserCircleIcon className="w-5 h-5 text-indigo-400" />
            </div>
          )}
        </div>
      ))}
      
      {isTyping && (
        <div className="flex gap-4 justify-start">
           <div className="w-8 h-8 rounded-full bg-mycelium-900 flex items-center justify-center shrink-0 border border-mycelium-700">
              <CpuChipIcon className="w-5 h-5 text-mycelium-400" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-bl-none px-5 py-4 border border-slate-700 flex items-center gap-1">
              <div className="w-2 h-2 bg-mycelium-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-mycelium-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-mycelium-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  );
};