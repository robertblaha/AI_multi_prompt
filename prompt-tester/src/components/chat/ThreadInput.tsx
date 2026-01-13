"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useStore } from "@/hooks/useStore";

interface ThreadInputProps {
  threadId: string;
}

export function ThreadInput({ threadId }: ThreadInputProps) {
  const [message, setMessage] = useState("");
  const { sendToThread } = useChat();
  const { threads } = useStore();
  const thread = threads.find((t) => t.id === threadId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = thread?.isLoading || false;
  const canSend = message.trim().length > 0 && !isLoading;

  const handleSend = () => {
    if (canSend) {
      sendToThread(threadId, message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    // Focus input when thread becomes active
    if (thread && !thread.isLoading) {
      textareaRef.current?.focus();
    }
  }, [thread?.isLoading]);

  if (!thread) return null;

  return (
    <div className="bg-card/30 p-3">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          placeholder="Continue conversation..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none flex-1 bg-background"
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">⌘</kbd> +{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">Enter</kbd> to send
      </p>
    </div>
  );
}
