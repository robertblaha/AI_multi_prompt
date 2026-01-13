"use client";

import { useCallback } from "react";
import { useStore } from "./useStore";
import type { ChatMessage, StreamResponse } from "@/types";

// Helper function to create or get current session
async function getOrCreateSession(
  apiKeyId: number | null,
  systemPrompt: string,
  mode: "single_repeat" | "multi_model"
): Promise<number> {
  const state = useStore.getState();
  
  // If we already have a session, return it
  if (state.currentSessionId) {
    return state.currentSessionId;
  }

  // Create new session
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKeyId,
      systemPrompt: systemPrompt || null,
      mode,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  const session = await response.json();
  useStore.getState().setCurrentSessionId(session.id);
  return session.id;
}

// Helper function to create a thread in DB
async function createThreadInDB(
  sessionId: number,
  modelId: string,
  iterationNumber?: number
): Promise<number> {
  const response = await fetch("/api/sessions/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      modelId,
      iterationNumber,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create thread");
  }

  const thread = await response.json();
  return thread.id;
}

// Helper function to save a message to DB
async function saveMessageToDB(
  threadId: number,
  role: "user" | "assistant",
  content: string,
  tokensInput?: number,
  tokensOutput?: number,
  cost?: number,
  latencyMs?: number
): Promise<void> {
  await fetch("/api/sessions/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId,
      role,
      content,
      tokensInput,
      tokensOutput,
      cost,
      latencyMs,
    }),
  });
}

// Helper function to send a single chat request
async function sendSingleChat(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      model: modelId,
      apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          continue;
        }
        try {
          const parsed: StreamResponse = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
          }
          if (parsed.usage) {
            usage = {
              prompt_tokens: parsed.usage.prompt_tokens,
              completion_tokens: parsed.usage.completion_tokens,
            };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return { content: fullContent, usage };
}

export function useChat() {
  const {
    selectedKeyId,
    mode,
    selectedModelId,
    repeatCount,
    selectedModelIds,
    additionalModels,
    models,
    systemPrompt,
    userPrompt,
    setUserPrompt,
    addThread,
    updateThread,
    setIsLoading,
    currentSessionId,
  } = useStore();

  const sendMessage = useCallback(async () => {
    if (!userPrompt.trim()) {
      return;
    }

    // Get the raw API key
    let apiKey: string;
    try {
      const keyResponse = await fetch(
        `/api/keys/raw${selectedKeyId ? `?id=${selectedKeyId}` : ""}`
      );
      if (!keyResponse.ok) {
        throw new Error("Failed to fetch API key");
      }
      const keyData = await keyResponse.json();
      apiKey = keyData.key;
    } catch (error) {
      console.error("Failed to get API key:", error);
      return;
    }

    // Build messages array
    const messages: ChatMessage[] = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    const userMessage = userPrompt.trim();
    messages.push({ role: "user", content: userMessage });

    // Create or get session
    let sessionId: number;
    try {
      sessionId = await getOrCreateSession(selectedKeyId, systemPrompt, mode);
    } catch (error) {
      console.error("Failed to create session:", error);
      return;
    }

    // Clear user prompt after sending
    setUserPrompt("");
    setIsLoading(true);

    const startTime = Date.now();
    const threadIds: string[] = [];
    const dbThreadIds: number[] = [];

    try {
      if (mode === "single_repeat") {
        // Single model, repeated N times
        if (!selectedModelId) {
          throw new Error("No model selected");
        }

        const model = models.find((m) => m.modelId === selectedModelId);
        const modelName = model?.displayName || selectedModelId;

        // Create threads for each iteration
        for (let i = 1; i <= repeatCount; i++) {
          const threadId = `thread-${Date.now()}-${i}`;
          threadIds.push(threadId);
          
          // Create thread in DB
          let dbThreadId: number;
          try {
            dbThreadId = await createThreadInDB(sessionId, selectedModelId, i);
            dbThreadIds.push(dbThreadId);
          } catch (error) {
            console.error("Failed to create thread in DB:", error);
            dbThreadIds.push(0);
          }

          addThread({
            id: threadId,
            dbThreadId,
            modelId: selectedModelId,
            modelName: `${modelName} #${i}`,
            messages: [...messages],
            isLoading: true,
            stats: {
              inputTokens: 0,
              outputTokens: 0,
              cost: 0,
              latencyMs: 0,
            },
          });

          // Save user message to DB
          if (dbThreadId) {
            try {
              await saveMessageToDB(dbThreadId, "user", userMessage);
            } catch (error) {
              console.error("Failed to save user message:", error);
            }
          }
        }

        // Send requests in parallel
        const requests = Array.from({ length: repeatCount }, (_, i) =>
          sendSingleChat(selectedModelId, messages, apiKey).then(
            (result) => ({ success: true, result, index: i }),
            (error) => ({ success: false, error, index: i })
          )
        );

        const results = await Promise.allSettled(requests);

        results.forEach((result, i) => {
          const threadId = threadIds[i];
          const dbThreadId = dbThreadIds[i];
          if (result.status === "fulfilled" && result.value.success) {
            const { content, usage } = result.value.result;
            const latencyMs = Date.now() - startTime;
            const state = useStore.getState();
            const currentThread = state.threads.find((t) => t.id === threadId);
            if (currentThread && content) {
              updateThread(threadId, {
                messages: [
                  ...currentThread.messages,
                  { role: "assistant", content },
                ],
                isLoading: false,
                stats: {
                  inputTokens: usage.prompt_tokens,
                  outputTokens: usage.completion_tokens,
                  cost: 0,
                  latencyMs,
                },
              });

              // Save assistant message to DB
              if (dbThreadId) {
                saveMessageToDB(
                  dbThreadId,
                  "assistant",
                  content,
                  usage.prompt_tokens,
                  usage.completion_tokens,
                  0, // cost will be calculated later
                  latencyMs
                ).catch((error) => {
                  console.error("Failed to save assistant message:", error);
                });
              }
            }
          } else {
            const error =
              result.status === "rejected"
                ? result.reason?.message || "Unknown error"
                : result.value.error?.message || "Request failed";
            updateThread(threadId, {
              isLoading: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      } else {
        // Multi-model mode
        // Collect all model IDs
        const allModelIds: string[] = [
          ...selectedModelIds,
          ...additionalModels
            .split(",")
            .map((m) => m.trim())
            .filter((m) => m.length > 0),
        ];

        if (allModelIds.length === 0) {
          throw new Error("No models selected");
        }

        // Create threads for each model
        for (const modelId of allModelIds) {
          const model = models.find((m) => m.modelId === modelId);
          const modelName = model?.displayName || modelId;
          const threadId = `thread-${Date.now()}-${modelId}`;
          threadIds.push(threadId);
          
          // Create thread in DB
          let dbThreadId: number;
          try {
            dbThreadId = await createThreadInDB(sessionId, modelId);
            dbThreadIds.push(dbThreadId);
          } catch (error) {
            console.error("Failed to create thread in DB:", error);
            dbThreadIds.push(0);
          }

          addThread({
            id: threadId,
            dbThreadId,
            modelId,
            modelName,
            messages: [...messages],
            isLoading: true,
            stats: {
              inputTokens: 0,
              outputTokens: 0,
              cost: 0,
              latencyMs: 0,
            },
          });

          // Save user message to DB
          if (dbThreadId) {
            try {
              await saveMessageToDB(dbThreadId, "user", userMessage);
            } catch (error) {
              console.error("Failed to save user message:", error);
            }
          }
        }

        // Send requests in parallel
        const requests = allModelIds.map((modelId, i) =>
          sendSingleChat(modelId, messages, apiKey).then(
            (result) => ({ success: true, result, modelId }),
            (error) => ({ success: false, error, modelId })
          )
        );

        const results = await Promise.allSettled(requests);

        results.forEach((result, i) => {
          const threadId = threadIds[i];
          const dbThreadId = dbThreadIds[i];
          if (result.status === "fulfilled" && result.value.success) {
            const { content, usage } = result.value.result;
            const latencyMs = Date.now() - startTime;
            const state = useStore.getState();
            const currentThread = state.threads.find((t) => t.id === threadId);
            if (currentThread && content) {
              updateThread(threadId, {
                messages: [
                  ...currentThread.messages,
                  { role: "assistant", content },
                ],
                isLoading: false,
                stats: {
                  inputTokens: usage.prompt_tokens,
                  outputTokens: usage.completion_tokens,
                  cost: 0,
                  latencyMs,
                },
              });

              // Save assistant message to DB
              if (dbThreadId) {
                saveMessageToDB(
                  dbThreadId,
                  "assistant",
                  content,
                  usage.prompt_tokens,
                  usage.completion_tokens,
                  0, // cost will be calculated later
                  latencyMs
                ).catch((error) => {
                  console.error("Failed to save assistant message:", error);
                });
              }
            }
          } else {
            const error =
              result.status === "rejected"
                ? result.reason?.message || "Unknown error"
                : result.value.error?.message || "Request failed";
            updateThread(threadId, {
              isLoading: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Mark all threads as failed
      threadIds.forEach((threadId) => {
        updateThread(threadId, {
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedKeyId,
    mode,
    selectedModelId,
    repeatCount,
    selectedModelIds,
    additionalModels,
    models,
    systemPrompt,
    userPrompt,
    setUserPrompt,
    addThread,
    updateThread,
    setIsLoading,
    currentSessionId,
  ]);

  // Function to continue conversation in a specific thread
  const sendToThread = useCallback(
    async (threadId: string, message: string) => {
      if (!message.trim()) return;

      const state = useStore.getState();
      const thread = state.threads.find((t) => t.id === threadId);
      if (!thread) return;

      // Get the raw API key
      let apiKey: string;
      try {
        const keyResponse = await fetch(
          `/api/keys/raw${selectedKeyId ? `?id=${selectedKeyId}` : ""}`
        );
        if (!keyResponse.ok) {
          throw new Error("Failed to fetch API key");
        }
        const keyData = await keyResponse.json();
        apiKey = keyData.key;
      } catch (error) {
        console.error("Failed to get API key:", error);
        return;
      }

      // Build messages array from thread history + new message
      const messages: ChatMessage[] = [...thread.messages];
      const userMessage = message.trim();
      messages.push({ role: "user", content: userMessage });

      // Update thread with user message
      updateThread(threadId, {
        messages,
        isLoading: true,
      });

      // Save user message to DB
      if (thread.dbThreadId) {
        try {
          await saveMessageToDB(thread.dbThreadId, "user", userMessage);
        } catch (error) {
          console.error("Failed to save user message:", error);
        }
      }

      const startTime = Date.now();

      try {
        const { content, usage } = await sendSingleChat(
          thread.modelId,
          messages,
          apiKey
        );

        const latencyMs = Date.now() - startTime;
        const updatedThread = useStore.getState().threads.find(
          (t) => t.id === threadId
        );
        if (updatedThread && content) {
          updateThread(threadId, {
            messages: [
              ...updatedThread.messages,
              { role: "assistant", content },
            ],
            isLoading: false,
            stats: {
              inputTokens:
                updatedThread.stats.inputTokens + usage.prompt_tokens,
              outputTokens:
                updatedThread.stats.outputTokens + usage.completion_tokens,
              cost: updatedThread.stats.cost,
              latencyMs: Math.round(
                (updatedThread.stats.latencyMs + latencyMs) / 2
              ),
            },
          });

          // Save assistant message to DB
          if (thread.dbThreadId) {
            saveMessageToDB(
              thread.dbThreadId,
              "assistant",
              content,
              usage.prompt_tokens,
              usage.completion_tokens,
              0, // cost will be calculated later
              latencyMs
            ).catch((error) => {
              console.error("Failed to save assistant message:", error);
            });
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        updateThread(threadId, {
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [selectedKeyId, updateThread]
  );

  // Function to send message to all active threads
  const sendToAllThreads = useCallback(
    async (message: string) => {
      const state = useStore.getState();
      const activeThreads = state.threads.filter((t) => !t.isLoading && !t.error);
      
      await Promise.allSettled(
        activeThreads.map((thread) => sendToThread(thread.id, message))
      );
    },
    [sendToThread]
  );

  return { sendMessage, sendToThread, sendToAllThreads };
}
