export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'tool_result' | 'error';
  metadata?: {
    suggestionType?: SuggestionType;
    executionTime?: number;
    modelUsed?: string;
    sourceUrls?: { title: string; uri: string }[];
  };
}

export type SuggestionType = 
  | 'Clarify'     // 🔍 Ask before answering
  | 'Expand'      // 📖 Full elaboration
  | 'Create'      // 🛠️ Build artifact
  | 'Connect'     // 🔗 Weave context threads
  | 'Challenge'   // ⚡ Dialectical negation
  | 'Crystallize';// 💎 Extract core pattern

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  reasoning: string; // Meta-cognition: why this suggestion?
  confidence: number;
}

export interface AnalysisResult {
  patternsDetected: string[];
  historyDepth: 'shallow' | 'medium' | 'deep';
  contextContinuity: string;
  dialecticalOpportunity: string;
  suggestions: Suggestion[];
}

export interface EngineState {
  isActive: boolean;
  isAnalyzing: boolean;
  isExecuting: boolean;
  logs: AnalysisLogEntry[];
  currentSuggestions: Suggestion[];
}

export interface AnalysisLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'pattern';
}