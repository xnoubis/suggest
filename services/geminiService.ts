import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
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
   - Connection (Related to previous topic?)
   - Challenge (Is there a dialectical opposite?)
   - Crystallization (Can we summarize the core essence?)

Output MUST be a JSON object with:
- patternsDetected: list of strings
- historyDepth: 'shallow' | 'medium' | 'deep'
- contextContinuity: description of how this links to past
- dialecticalOpportunity: description of a potential counter-point
- suggestions: Array of exactly 5 suggestions covering different types from [Clarify, Expand, Create, Connect, Challenge, Crystallize].
`;

// Define the mock Drive Search tool for the "Create/Connect" agentic capabilities
const searchDriveTool: FunctionDeclaration = {
  name: 'searchDrive',
  description: 'Search the user\'s Google Drive for relevant documents.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query.' },
      fileType: { type: Type.STRING, description: 'Optional file type filter (docs, sheets, slides).' }
    },
    required: ['query']
  }
};

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
    // Assuming API Key is available in process.env.API_KEY as per instructions
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeContext(history: Message[], lastInput: string): Promise<AnalysisResult> {
    try {
      // We use Flash for rapid analysis
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
          temperature: 0.3, // Low temperature for consistent analysis
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
  ): Promise<{ text: string, modelUsed: string }> {
    try {
      let model = 'gemini-2.5-flash';
      let config: any = {
        temperature: 0.7,
      };

      const isComplex = ['Create', 'Challenge', 'Crystallize'].includes(suggestion.type);
      const needsSearch = suggestion.type === 'Expand' || suggestion.type === 'Connect';

      if (isComplex) {
        // Use Pro + Thinking for complex tasks
        model = 'gemini-3-pro-preview';
        config.thinkingConfig = { thinkingBudget: 32768 }; // Max budget as requested
      } else if (needsSearch) {
        // Use Flash + Search for information retrieval
        model = 'gemini-2.5-flash'; 
        // Note: guidelines prohibit mixing googleSearch with functionDeclarations
        config.tools = [{ functionDeclarations: [searchDriveTool] }];
      } else {
         // Default flash for simple clarify
         model = 'gemini-2.5-flash';
      }

      const taskPrompt = `
        TASK: Execute the following suggestion:
        Type: ${suggestion.type}
        Title: ${suggestion.title}
        Description: ${suggestion.description}
        
        CONTEXT:
        ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
        USER: ${lastInput}
        
        INSTRUCTIONS:
        Perform the suggested action comprehensively. 
        If the type is 'Create', provide the code or artifact clearly.
        If 'Challenge', be dialectical and offer the antithesis.
        If 'Crystallize', summarize the essence.
      `;

      const response = await this.ai.models.generateContent({
        model,
        contents: taskPrompt,
        config: config
      });

      // Handle function calling (Mocking Drive Search)
      // Note: In a real app we would loop, here we simplify to one turn of tools or text
      if (response.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
         const fc = response.candidates[0].content.parts[0].functionCall;
         if (fc.name === 'searchDrive') {
            // Mock response
            const mockFiles = [
               { title: "Project Alpha Specs.pdf", snippet: "Specs for the new engine..." },
               { title: "Meeting Notes 2024.docx", snippet: "Discussed Q4 goals..." }
            ];
            // Feed back to model (simplified for this artifact: just append to prompt and re-run)
            const followUpPrompt = `${taskPrompt}\n\nTOOL RESULT (searchDrive): Found files: ${JSON.stringify(mockFiles)}. Incorporate this into your answer.`;
            
            const followUpResponse = await this.ai.models.generateContent({
              model,
              contents: followUpPrompt,
              config: {
                // Strip tools for final answer to avoid loops in this simple implementation
                thinkingConfig: isComplex ? { thinkingBudget: 16000 } : undefined 
              }
            });
            return { text: followUpResponse.text || "Error processing tool result.", modelUsed: model };
         }
      }

      return { text: response.text || "No response generated.", modelUsed: model };
    } catch (error) {
      console.error("Execution failed:", error);
      return { text: "Error executing suggestion. Please try again.", modelUsed: "error" };
    }
  }
}

export const geminiService = new GeminiService();