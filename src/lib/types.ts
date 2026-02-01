export interface Settings {
  groqApiKey: string;
  geminiApiKey: string;
  groqModel: string;
  geminiModel: string;
  preferredProvider: 'groq' | 'gemini';
  maxPages: number;
}

export interface AnalysisResult {
  url: string;
  title: string;
  analyzedAt: number;
  contentPreview: string;
  analysis: string;
  provider: string;
  model: string;
}

export interface StorageData {
  settings: Settings;
  results: Record<string, AnalysisResult[]>;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  internalLinks: string[];
}

export interface AnalyzeRequest {
  type: 'analyze';
  url: string;
  title: string;
  content: string;
}

export interface GetContentRequest {
  type: 'getContent';
}

export interface GetLinksRequest {
  type: 'getLinks';
}

export interface StartBatchAnalysisRequest {
  type: 'startBatchAnalysis';
  urls: string[];
}

export interface AnalysisProgress {
  type: 'analysisProgress';
  current: number;
  total: number;
  currentUrl: string;
  status: 'analyzing' | 'navigating' | 'complete' | 'error';
  error?: string;
}

export type MessageRequest =
  | AnalyzeRequest
  | GetContentRequest
  | GetLinksRequest
  | StartBatchAnalysisRequest;

export interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}
