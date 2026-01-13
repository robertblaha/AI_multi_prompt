export interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: string;
  isDefault: boolean;
}

export interface FavoriteModel {
  id: number;
  modelId: string;
  displayName: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SavedPrompt {
  id: number;
  name: string;
  type: "system" | "user";
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: number;
  name?: string;
  apiKeyId?: number;
  systemPrompt?: string;
  mode: "single_repeat" | "multi_model";
  createdAt: string;
}

export interface Thread {
  id: number;
  sessionId: number;
  modelId: string;
  iterationNumber?: number;
  createdAt: string;
}

export interface Message {
  id: number;
  threadId: number;
  role: "user" | "assistant";
  content: string;
  attachments?: string;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface ThreadStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  messageCount: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamDelta {
  content?: string;
  role?: string;
}

export interface StreamChoice {
  delta: StreamDelta;
  finish_reason: string | null;
}

export interface StreamResponse {
  id: string;
  model: string;
  choices: StreamChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
