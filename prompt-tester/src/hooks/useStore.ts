import { create } from "zustand";
import type { ApiKey, FavoriteModel, ChatMessage, Session } from "@/types";

interface Thread {
  id: string;
  dbThreadId?: number; // Database thread ID for persistence
  modelId: string;
  modelName: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string;
  stats: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
  };
}

interface AppState {
  // API Keys
  apiKeys: ApiKey[];
  selectedKeyId: number | null;
  setApiKeys: (keys: ApiKey[]) => void;
  setSelectedKeyId: (id: number | null) => void;

  // Models
  models: FavoriteModel[];
  selectedModelId: string | null;
  setModels: (models: FavoriteModel[]) => void;
  setSelectedModelId: (id: string | null) => void;

  // Mode selection
  mode: "single_repeat" | "multi_model";
  setMode: (mode: "single_repeat" | "multi_model") => void;
  repeatCount: number;
  setRepeatCount: (count: number) => void;
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  additionalModels: string; // comma-separated model IDs
  setAdditionalModels: (models: string) => void;

  // Prompts
  systemPrompt: string;
  userPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  setUserPrompt: (prompt: string) => void;

  // Threads (chat conversations)
  threads: Thread[];
  activeThreadId: string | null;
  addThread: (thread: Thread) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  appendToThread: (id: string, content: string) => void;
  setActiveThreadId: (id: string | null) => void;
  clearThreads: () => void;

  // Session management
  currentSessionId: number | null;
  setCurrentSessionId: (id: number | null) => void;
  loadSession: (session: Session & { threads: any[] }) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // API Keys
  apiKeys: [],
  selectedKeyId: null,
  setApiKeys: (keys) =>
    set((state) => {
      // Auto-select default key if none selected
      if (state.selectedKeyId === null && keys.length > 0) {
        const defaultKey = keys.find((k) => k.isDefault) || keys[0];
        return { apiKeys: keys, selectedKeyId: defaultKey.id };
      }
      return { apiKeys: keys };
    }),
  setSelectedKeyId: (id) => set({ selectedKeyId: id }),

  // Models
  models: [],
  selectedModelId: null,
  setModels: (models) =>
    set((state) => {
      // Auto-select first active model if none selected
      if (state.selectedModelId === null && models.length > 0) {
        const activeModel = models.find((m) => m.isActive);
        return {
          models,
          selectedModelId: activeModel?.modelId || models[0]?.modelId || null,
        };
      }
      return { models };
    }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),

  // Mode selection
  mode: "single_repeat",
  setMode: (mode) => set({ mode }),
  repeatCount: 1,
  setRepeatCount: (count) => set({ repeatCount: Math.max(1, Math.min(10, count)) }),
  selectedModelIds: [],
  setSelectedModelIds: (ids) => set({ selectedModelIds: ids }),
  additionalModels: "",
  setAdditionalModels: (models) => set({ additionalModels: models }),

  // Prompts
  systemPrompt: "",
  userPrompt: "",
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setUserPrompt: (prompt) => set({ userPrompt: prompt }),

  // Threads
  threads: [],
  activeThreadId: null,
  addThread: (thread) =>
    set((state) => ({
      threads: [...state.threads, thread],
      activeThreadId: thread.id,
    })),
  updateThread: (id, updates) =>
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  appendToThread: (id, content) =>
    set((state) => ({
      threads: state.threads.map((t) => {
        if (t.id !== id) return t;
        const messages = [...t.messages];
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          messages[messages.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + content,
          };
        } else {
          messages.push({ role: "assistant", content });
        }
        return { ...t, messages };
      }),
    })),
  setActiveThreadId: (id) => set({ activeThreadId: id }),
  clearThreads: () => set({ threads: [], activeThreadId: null, currentSessionId: null }),

  // Session management
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  loadSession: (sessionData) => {
    try {
      const state = useStore.getState();
      const systemPrompt = sessionData.systemPrompt || "";
      
      // Ensure threads is an array
      const threads = Array.isArray(sessionData.threads) ? sessionData.threads : [];
      
      const loadedThreads: Thread[] = threads.map((dbThread: any) => {
      const model = state.models.find((m) => m.modelId === dbThread.modelId);
      const modelName = model?.displayName || dbThread.modelId;
      
      // Build messages array: start with system prompt if exists, then all DB messages
      const threadMessages: ChatMessage[] = [];
      
      // Add system prompt as first message if it exists
      if (systemPrompt.trim()) {
        threadMessages.push({
          role: "system",
          content: systemPrompt,
        });
      }
      
      // Add all messages from DB (user and assistant)
      const dbMessages = dbThread.messages.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      
      threadMessages.push(...dbMessages);

      // Calculate stats from messages (only assistant messages have tokens)
      const assistantMessages = dbThread.messages.filter((m: any) => m.role === "assistant");
      const stats = assistantMessages.reduce(
        (acc: any, msg: any) => ({
          inputTokens: acc.inputTokens + (msg.tokensInput || 0),
          outputTokens: acc.outputTokens + (msg.tokensOutput || 0),
          cost: acc.cost + (msg.cost || 0),
          latencyMs: acc.latencyMs + (msg.latencyMs || 0),
        }),
        { inputTokens: 0, outputTokens: 0, cost: 0, latencyMs: 0 }
      );

      // Calculate average latency
      const avgLatency = assistantMessages.length > 0 
        ? stats.latencyMs / assistantMessages.length 
        : 0;

      return {
        id: `thread-${dbThread.id}`,
        dbThreadId: dbThread.id,
        modelId: dbThread.modelId,
        modelName: dbThread.iterationNumber
          ? `${modelName} #${dbThread.iterationNumber}`
          : modelName,
        messages: threadMessages,
        isLoading: false,
        stats: {
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          cost: stats.cost,
          latencyMs: avgLatency,
        },
      };
    });

      // Determine selected models based on threads
      const sessionMode = sessionData.mode || "single_repeat";
      let selectedModelId: string | null = null;
      let selectedModelIds: string[] = [];
      let repeatCount = 1;
      
      if (sessionMode === "single_repeat" && loadedThreads.length > 0) {
        // For single_repeat, use the model from the first thread
        selectedModelId = loadedThreads[0].modelId;
        // Count threads with the same model (iterations)
        repeatCount = loadedThreads.filter(t => t.modelId === selectedModelId).length;
      } else if (sessionMode === "multi_model" && loadedThreads.length > 0) {
        // For multi_model, collect all unique model IDs
        const uniqueModelIds = [...new Set(loadedThreads.map(t => t.modelId))];
        selectedModelIds = uniqueModelIds;
      }

      // Set session configuration
      set({
        currentSessionId: sessionData.id,
        threads: loadedThreads,
        activeThreadId: loadedThreads[0]?.id || null,
        systemPrompt: systemPrompt,
        mode: sessionMode,
        selectedModelId: selectedModelId,
        selectedModelIds: selectedModelIds,
        repeatCount: repeatCount,
        // Optionally set API key if it's in the session
        selectedKeyId: sessionData.apiKeyId || state.selectedKeyId,
      });
    } catch (error) {
      console.error("Failed to load session:", error);
      throw error;
    }
  },

  // UI State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
