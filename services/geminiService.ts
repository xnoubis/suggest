import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Message, AnalysisResult, Suggestion, SuggestionType } from "../types";

const SYSTEM_INSTRUCTION_ANALYSIS = `
You are the Mycelial Suggestion Engine. Your purpose is not to answer directly, but to analyze the conversation substrate and sprout potential paths forward.

Principles:
1. Treat every input as a spore that must be compared against the entire conversation history.
2. Identify patterns: Question, Imperative, Continuation, Disagreement.
3. Detect opportunities for:
   - Clarification (Ambiguity?)
   - Expansion (Depth available?)
   - Creation (Artifact needed?)
   - Connection (Related to previous topic? New context needed?)
   - Challenge (Is there a dialectical opposite?)
   - Crystallization (Can we summarize the core essence?)

Output MUST be a JSON object with:
- patternsDetected: list of strings
- historyDepth: 'shallow' | 'medium' | 'deep'
- contextContinuity: description of how this links to past
- dialecticalOpportunity: description of a potential counter-point
- suggestions: Array of exactly 5 suggestions covering different types from [Clarify, Expand, Create, Connect, Challenge, Crystallize].
`;

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    patternsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
    historyDepth: { type: Type.STRING, enum: ['shallow', 'medium', 'deep'] },
    contextContinuity: { type: Type.STRING },
    dialecticalOpportunity: { type: Type.STRING },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['Clarify', 'Expand', 'Create', 'Connect', 'Challenge', 'Crystallize'] },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ['type', 'title', 'description', 'reasoning', 'confidence']
      }
    }
  },
  required: ['patternsDetected', 'suggestions', 'historyDepth', 'contextContinuity']
};

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeContext(history: Message[], lastInput: string): Promise<AnalysisResult> {
    try {
      const model = 'gemini-2.5-flash';
      
      const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const fullPrompt = `HISTORY:\n${historyText}\n\nNEW INPUT:\nUSER: ${lastInput}\n\nAnalyze this context and generate suggestions.`;

      const response = await this.ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_ANALYSIS,
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.3,
        }
      });

      const text = response.text;
      if (!text) throw new Error("No analysis generated");
      
      return JSON.parse(text) as AnalysisResult;
    } catch (error) {
      console.error("Analysis failed:", error);
      throw error;
    }
  }

  async executeSuggestion(
    suggestion: Suggestion, 
    history: Message[], 
    lastInput: string
  ): Promise<{ text: string, modelUsed: string, sourceUrls?: { title: string, uri: string }[] }> {
    try {
      let model = 'gemini-2.5-flash';
      let config: any = {
        temperature: 0.7,
      };

      // Configuration logic based on suggestion type
      if (['Create', 'Challenge', 'Crystallize'].includes(suggestion.type)) {
        // High cognitive load -> Thinking Model
        model = 'gemini-3-pro-preview';
        config.thinkingConfig = { thinkingBudget: 32768 };
      } else if (['Expand', 'Connect'].includes(suggestion.type)) {
        // Information retrieval -> Google Search
        model = 'gemini-2.5-flash'; 
        config.tools = [{ googleSearch: {} }];
      } else {
         // 'Clarify' or fallback -> Fast Model
         model = 'gemini-2.5-flash';
      }

      const taskPrompt = `
        TASK: Execute the following suggestion:
        Type: ${suggestion.type}
        Title: ${suggestion.title}
        Description: ${suggestion.description}
        Reasoning: ${suggestion.reasoning}
        
        CONTEXT:
        ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
        USER: ${lastInput}
        
        INSTRUCTIONS:
        Perform the suggested action comprehensively.
        - If 'Create': Provide the full code, text, or artifact.
        - If 'Challenge': Provide a dialectical antithesis or counter-argument.
        - If 'Crystallize': Distill the conversation into its core essence/insight.
        - If 'Expand'/'Connect': Use search tools if needed to provide accurate, up-to-date context.
        - If 'Clarify': Ask the necessary questions to resolve ambiguity.
      `;

      const response = await this.ai.models.generateContent({
        model,
        contents: taskPrompt,
        config: config
      });

      // Extract search grounding if present
      const sourceUrls: { title: string, uri: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            sourceUrls.push({
              title: chunk.web.title || "Source",
              uri: chunk.web.uri
            });
          }
        });
      }

      return { 
        text: response.text || "No response generated.", 
        modelUsed: model,
        sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined
      };
    } catch (error) {
      console.error("Execution failed:", error);
      return { text: "Error executing suggestion. Please try again.", modelUsed: "error" };
    }
  }
}

export const geminiService = new GeminiService();