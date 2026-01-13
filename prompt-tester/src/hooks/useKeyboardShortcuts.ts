"use client";

import { useEffect, useCallback } from "react";
import { useStore } from "./useStore";
import { useChat } from "./useChat";
import { toast } from "sonner";

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const {
    selectedKeyId,
    mode,
    selectedModelId,
    repeatCount,
    selectedModelIds,
    additionalModels,
    userPrompt,
    systemPrompt,
    isLoading,
    threads,
  } = useStore();
  const { sendMessage, sendToAllThreads } = useChat();

  // Check if we can send
  const hasValidConfig =
    mode === "single_repeat"
      ? selectedModelId && repeatCount > 0
      : selectedModelIds.length > 0 ||
        additionalModels.split(",").some((m) => m.trim().length > 0);

  const canSend = selectedKeyId && hasValidConfig && userPrompt.trim() && !isLoading;

  // Save prompt to database
  const savePrompt = useCallback(async (type: "system" | "user") => {
    const content = type === "system" ? systemPrompt : userPrompt;
    if (!content.trim()) {
      toast.error(`No ${type} prompt to save`);
      return;
    }

    const name = prompt(`Enter a name for this ${type} prompt:`);
    if (!name) return;

    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          content: content.trim(),
        }),
      });

      if (response.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} prompt saved!`);
      } else {
        toast.error("Failed to save prompt");
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast.error("Failed to save prompt");
    }
  }, [systemPrompt, userPrompt]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Cmd/Ctrl + Enter - Send message
      if (cmdOrCtrl && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (canSend) {
          sendMessage();
        } else if (!selectedKeyId) {
          toast.error("Please select an API key first");
        } else if (!hasValidConfig) {
          toast.error("Please configure model selection");
        } else if (!userPrompt.trim()) {
          toast.error("Please enter a message");
        }
        return;
      }

      // Cmd/Ctrl + Shift + Enter - Send to all threads
      if (cmdOrCtrl && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        if (threads.length > 1) {
          const message = prompt("Enter message to send to all threads:");
          if (message?.trim()) {
            sendToAllThreads(message);
          }
        } else {
          toast.info("Only one thread active");
        }
        return;
      }

      // Cmd/Ctrl + S - Save current prompt
      if (cmdOrCtrl && event.key === "s" && !event.shiftKey) {
        event.preventDefault();
        // Check which prompt has content, prioritize user prompt
        if (userPrompt.trim()) {
          savePrompt("user");
        } else if (systemPrompt.trim()) {
          savePrompt("system");
        } else {
          toast.error("No prompt to save");
        }
        return;
      }

      // Cmd/Ctrl + Shift + S - Save system prompt specifically
      if (cmdOrCtrl && event.shiftKey && event.key === "s") {
        event.preventDefault();
        if (systemPrompt.trim()) {
          savePrompt("system");
        } else {
          toast.error("No system prompt to save");
        }
        return;
      }

      // Escape - Cancel ongoing requests (TODO: implement abort controller)
      if (event.key === "Escape" && isLoading) {
        toast.info("Request cancellation not yet implemented");
        return;
      }
    },
    [
      canSend,
      selectedKeyId,
      hasValidConfig,
      userPrompt,
      systemPrompt,
      threads.length,
      isLoading,
      sendMessage,
      sendToAllThreads,
      savePrompt,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return available shortcuts for documentation
  return {
    shortcuts: [
      { key: "⌘/Ctrl + Enter", description: "Send message" },
      { key: "⌘/Ctrl + Shift + Enter", description: "Send to all threads" },
      { key: "⌘/Ctrl + S", description: "Save user prompt" },
      { key: "⌘/Ctrl + Shift + S", description: "Save system prompt" },
    ],
  };
}
