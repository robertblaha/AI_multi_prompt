"use client";

import { Sidebar } from "@/components/Sidebar";
import { ResizableSidebar, useSidebarWidth } from "@/components/ResizableSidebar";
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
  const sidebarWidth = useSidebarWidth();
  
  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Resizable Sidebar */}
      <ResizableSidebar defaultWidth={288} minWidth={220} maxWidth={480}>
        <Sidebar />
      </ResizableSidebar>
      
      {/* Main Content Area with dynamic left margin for sidebar */}
      <main 
        className="flex-1 flex flex-col min-w-0 transition-[margin] duration-75"
        style={{ marginLeft: sidebarWidth }}
      >
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
