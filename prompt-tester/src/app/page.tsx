"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatThread } from "@/components/chat/ChatThread";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/hooks/useStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { isLoading, threads } = useStore();
  const hasLoadingThread = threads.some(t => t.isLoading);
  
  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-72 z-10">
        <Sidebar />
      </div>
      
      {/* Main Content Area with left margin for sidebar */}
      <main className="flex-1 flex flex-col min-w-0 ml-72">
        {/* Fixed Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30 shrink-0">
          <h2 className="font-medium">Chat</h2>
          {(isLoading || hasLoadingThread) && (
            <Badge variant="outline" className="flex items-center gap-2 bg-amber-500/10 border-amber-500/20 text-amber-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Generating...</span>
            </Badge>
          )}
        </header>

        {/* Chat Area - only this scrolls */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatThread />
        </div>

        <Separator />

        {/* Fixed Input Area */}
        <div className="p-6 bg-card/30 shrink-0">
          <ChatInput />
        </div>
      </main>
    </div>
  );
}
