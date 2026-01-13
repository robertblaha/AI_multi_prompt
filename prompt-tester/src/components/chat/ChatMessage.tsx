"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";
import { User, Bot, Settings } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isUser && "bg-muted/50",
        isAssistant && "bg-card",
        isSystem && "bg-amber-500/10 border border-amber-500/20"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser && "bg-cyan-500/20 text-cyan-500",
          isAssistant && "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
          isSystem && "bg-amber-500/20 text-amber-500"
        )}
      >
        {isUser && <User className="w-4 h-4" />}
        {isAssistant && <Bot className="w-4 h-4" />}
        {isSystem && <Settings className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser && "You"}
            {isAssistant && "Assistant"}
            {isSystem && "System"}
          </span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap break-words text-foreground/90">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
