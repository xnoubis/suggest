import React, { useState, useEffect, useRef } from 'react';
import { ChatArea } from './components/ChatArea';
import { SuggestionCard } from './components/SuggestionCard';
import { AnalysisLog } from './components/AnalysisLog';
import { Message, Suggestion, EngineState, AnalysisLogEntry } from './types';
import { geminiService } from './services/geminiService';
import { PaperAirplaneIcon, SparklesIcon, AdjustmentsHorizontalIcon, StopIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [engineActive, setEngineActive] = useState(true);
  const [engineState, setEngineState] = useState<EngineState>({
    isActive: true,
    isAnalyzing: false,
    isExecuting: false,
    logs: [],
    currentSuggestions: []
  });

  // Refs for tracking async operations
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Helpers
  const addLog = (message: string, type: AnalysisLogEntry['type'] = 'info') => {
    setEngineState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: crypto.randomUUID(), timestamp: Date.now(), message, type }]
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || engineState.isExecuting) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // Engine Logic
    if (engineActive) {
      await processWithEngine(userMsg);
    } else {
      // Standard Chat Fallback (using a simple execution for consistency)
      setEngineState(prev => ({ ...prev, isExecuting: true }));
      try {
        const response = await geminiService.executeSuggestion(
            { type: 'Expand', title: 'Reply', description: 'Standard reply', reasoning: 'Engine off', confidence: 1, id: 'std' },
            messagesRef.current, 
            userMsg.content
        );
         setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'model',
          content: response.text,
          timestamp: Date.now(),
          metadata: { 
            modelUsed: response.modelUsed,
            sourceUrls: response.sourceUrls
          }
        }]);
      } finally {
        setEngineState(prev => ({ ...prev, isExecuting: false }));
      }
    }
  };

  const processWithEngine = async (lastUserMessage: Message) => {
    setEngineState(prev => ({ ...prev, isAnalyzing: true, currentSuggestions: [] }));
    addLog('Spore detected. Initiating substrate analysis...', 'info');

    try {
      // 1. Analyze
      const analysis = await geminiService.analyzeContext(
        [...messagesRef.current], 
        lastUserMessage.content
      );

      // Log patterns
      analysis.patternsDetected.forEach(p => addLog(`Pattern: ${p}`, 'pattern'));
      addLog(`History Depth: ${analysis.historyDepth}`, 'info');
      addLog(`Continuity: ${analysis.contextContinuity.substring(0, 50)}...`, 'info');

      setEngineState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentSuggestions: analysis.suggestions
      }));
      addLog(`Generated ${analysis.suggestions.length} potential growth paths.`, 'success');

    } catch (error) {
      addLog('Analysis failed: ' + (error as Error).message, 'warning');
      setEngineState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    setEngineState(prev => ({ ...prev, isExecuting: true, currentSuggestions: [] })); // Clear suggestions to prevent double click
    addLog(`Selected path: ${suggestion.type} - ${suggestion.title}`, 'success');
    addLog('Weaving response...', 'info');

    try {
      // Logic: History is everything up to the last user message, which is the last message in array.
      // But wait, if user sent message, then engine analyzed. Array is [..., UserMsg].
      // So history is messagesRef.current.slice(0, -1). Last input is messagesRef.current.last.
      const lastMsg = messagesRef.current[messagesRef.current.length - 1];
      const history = messagesRef.current.slice(0, -1);

      const result = await geminiService.executeSuggestion(
        suggestion,
        history,
        lastMsg.content
      );

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        content: result.text,
        timestamp: Date.now(),
        metadata: {
          suggestionType: suggestion.type,
          modelUsed: result.modelUsed,
          sourceUrls: result.sourceUrls
        }
      }]);
      
      addLog('Execution complete.', 'success');

    } catch (error) {
      addLog('Execution failed.', 'warning');
    } finally {
      setEngineState(prev => ({ ...prev, isExecuting: false }));
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* LEFT: Main Chat */}
      <div className="flex-1 flex flex-col relative transition-all duration-300">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-mycelium-400" />
            <h1 className="font-bold text-lg tracking-tight text-white">
              Mycelial <span className="text-mycelium-400 font-light">Engine</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-900 rounded-full p-1 border border-slate-700">
               <span className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${engineActive ? 'text-mycelium-300' : 'text-slate-500'}`}>
                 {engineActive ? 'ACTIVE' : 'DORMANT'}
               </span>
               <button 
                 onClick={() => setEngineActive(!engineActive)}
                 className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${engineActive ? 'bg-mycelium-600' : 'bg-slate-700'}`}
               >
                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${engineActive ? 'translate-x-4' : 'translate-x-0'}`} />
               </button>
             </div>
          </div>
        </header>

        <ChatArea messages={messages} isTyping={engineState.isExecuting || engineState.isAnalyzing} />

        {/* Input Area */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-md">
          <div className="max-w-4xl mx-auto relative">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder={engineActive ? "Inject spore into substrate..." : "Type a message..."}
               className="w-full bg-slate-800 text-slate-100 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-mycelium-500/50 border border-slate-700 placeholder-slate-500 transition-shadow"
               disabled={engineState.isExecuting || engineState.isAnalyzing}
             />
             <button 
               onClick={handleSendMessage}
               disabled={!input.trim() || engineState.isExecuting || engineState.isAnalyzing}
               className="absolute right-3 top-3 p-1.5 bg-mycelium-600 text-white rounded-lg hover:bg-mycelium-500 disabled:opacity-50 disabled:hover:bg-mycelium-600 transition-colors"
             >
               <PaperAirplaneIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Engine Panel (Conditional or always visible on desktop) */}
      {engineActive && (
        <div className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col shadow-2xl z-20 hidden md:flex">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2 text-mycelium-400 mb-1">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <h2 className="text-sm font-bold tracking-widest uppercase">Mycelial State</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Analysis Log */}
            <section>
              <AnalysisLog logs={engineState.logs} isActive={true} />
            </section>

            {/* Suggestions List */}
            <section>
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Growth Paths</h3>
                 {engineState.isAnalyzing && <span className="text-xs text-mycelium-500 animate-pulse">Growing...</span>}
              </div>
              
              <div className="space-y-3">
                {engineState.currentSuggestions.length === 0 && !engineState.isAnalyzing && !engineState.isExecuting && (
                  <div className="text-center p-8 border border-dashed border-slate-800 rounded-lg">
                    <p className="text-slate-600 text-sm">Waiting for input...</p>
                  </div>
                )}

                {engineState.currentSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    disabled={engineState.isExecuting}
                  />
                ))}
              </div>
            </section>
          </div>
          
          {/* Status Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
            <span>MODELS: 2.5 FLASH / 3 PRO</span>
            <span>STATUS: {engineState.isExecuting ? 'EXECUTING' : engineState.isAnalyzing ? 'ANALYZING' : 'IDLE'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;