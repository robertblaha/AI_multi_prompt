"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/hooks/useStore";
import { ChatMessage } from "./ChatMessage";
import { ThreadInput } from "./ThreadInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle, Coins, Zap, Hash, Send, GitCompare, Download, FileText, FileCode } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useChat } from "@/hooks/useChat";
import { useState } from "react";

export function ChatThread() {
  const { threads, activeThreadId, setActiveThreadId, currentSessionId } = useStore();
  const { sendToAllThreads } = useChat();
  const [compareMode, setCompareMode] = useState(false);
  const [sendAllDialogOpen, setSendAllDialogOpen] = useState(false);
  const [sendAllMessage, setSendAllMessage] = useState("");
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Export functions
  const exportSession = async (format: "markdown" | "html" | "json") => {
    if (!currentSessionId) {
      toast.error("No session to export");
      return;
    }

    try {
      const response = await fetch(`/api/export?sessionId=${currentSessionId}&format=${format}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const ext = format === "markdown" ? "md" : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${currentSessionId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export session");
    }
  };

  const exportThread = async (dbThreadId: number | undefined, format: "markdown" | "json") => {
    if (!dbThreadId) {
      toast.error("Thread not saved yet");
      return;
    }

    try {
      const response = await fetch(`/api/export?threadId=${dbThreadId}&format=${format}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const ext = format === "markdown" ? "md" : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thread-${dbThreadId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Thread exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export thread");
    }
  };

  const printSession = async () => {
    if (!currentSessionId) {
      toast.error("No session to print");
      return;
    }

    try {
      const response = await fetch(`/api/export?sessionId=${currentSessionId}&format=html`);
      if (!response.ok) throw new Error("Export failed");

      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to prepare for print");
    }
  };

  // Calculate session stats
  const sessionStats = threads.reduce(
    (acc, thread) => ({
      totalInputTokens: acc.totalInputTokens + thread.stats.inputTokens,
      totalOutputTokens: acc.totalOutputTokens + thread.stats.outputTokens,
      totalCost: acc.totalCost + thread.stats.cost,
      totalLatency: acc.totalLatency + thread.stats.latencyMs,
      threadCount: acc.threadCount + 1,
    }),
    {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalLatency: 0,
      threadCount: 0,
    }
  );

  const avgLatency =
    threads.length > 0 ? sessionStats.totalLatency / threads.length : 0;

  // Find viewport elements for each thread
  useEffect(() => {
    threads.forEach((thread) => {
      const scrollArea = document.getElementById(`scroll-area-${thread.id}`);
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
        if (viewport) {
          scrollRefs.current[thread.id] = viewport;
        }
      }
    });
  }, [threads]);

  // Auto-scroll to bottom when new message is added or thread stops loading
  useEffect(() => {
    if (!activeThreadId) return;
    
    const activeThread = threads.find(t => t.id === activeThreadId);
    if (!activeThread) return;

    const scrollContainer = scrollRefs.current[activeThreadId];
    if (scrollContainer) {
      // Scroll when messages change or when loading stops (response received)
      const timeoutId = setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [threads, activeThreadId]);

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <span className="text-3xl">💬</span>
          </div>
          <h2 className="text-xl font-semibold">Start a Conversation</h2>
          <p className="text-muted-foreground">
            Select an API key and model, then enter your prompt to begin testing.
          </p>
        </div>
      </div>
    );
  }

  // Get last assistant messages for comparison (including stats)
  const lastAssistantMessages = threads.map((thread) => {
    const lastAssistant = [...thread.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return {
      threadId: thread.id,
      modelName: thread.modelName,
      content: lastAssistant?.content || "",
      stats: thread.stats,
    };
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sticky Session Summary Bar */}
      {threads.length > 0 && (
        <div className="border-b border-border bg-card/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              <span>
                {sessionStats.totalInputTokens.toLocaleString()} in /{" "}
                {sessionStats.totalOutputTokens.toLocaleString()} out
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>${sessionStats.totalCost.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>
                {avgLatency > 0
                  ? `${(avgLatency / 1000).toFixed(1)}s avg`
                  : "-"}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {sessionStats.threadCount} thread{sessionStats.threadCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {threads.length > 1 && (
              <>
                <Dialog open={sendAllDialogOpen} onOpenChange={setSendAllDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Send className="w-3 h-3 mr-1.5" />
                      Send to all
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send message to all threads</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Textarea
                        placeholder="Enter message to send to all active threads..."
                        value={sendAllMessage}
                        onChange={(e) => setSendAllMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSendAllDialogOpen(false);
                            setSendAllMessage("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (sendAllMessage.trim()) {
                              sendToAllThreads(sendAllMessage);
                              setSendAllDialogOpen(false);
                              setSendAllMessage("");
                            }
                          }}
                          disabled={!sendAllMessage.trim()}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareMode(!compareMode)}
                  className="text-xs"
                >
                  <GitCompare className="w-3 h-3 mr-1.5" />
                  Compare
                </Button>
              </>
            )}
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="w-3 h-3 mr-1.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportSession("markdown")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportSession("html")}>
                  <FileCode className="w-4 h-4 mr-2" />
                  Export as HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportSession("json")}>
                  <FileCode className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={printSession}>
                  <FileText className="w-4 h-4 mr-2" />
                  Print / Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {compareMode && threads.length > 1 ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {lastAssistantMessages
              .filter((m) => m.content)
              .map((msg) => (
                <div
                  key={msg.threadId}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-border/50">
                    <Badge variant="outline" className="w-fit">{msg.modelName}</Badge>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        <span>{msg.stats.inputTokens.toLocaleString()} in / {msg.stats.outputTokens.toLocaleString()} out</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        <span>${msg.stats.cost.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{msg.stats.latencyMs > 0 ? `${(msg.stats.latencyMs / 1000).toFixed(1)}s` : "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap break-words text-foreground/90">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      ) : (
        <Tabs
          value={activeThreadId || threads[0]?.id}
          onValueChange={setActiveThreadId}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Sticky Tabs List */}
          <div className="border-b border-border px-4 bg-card/30 shrink-0">
            <TabsList className="h-12 bg-transparent gap-1">
            {threads.map((thread) => (
              <TabsTrigger
                key={thread.id}
                value={thread.id}
                className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <span className="truncate max-w-[120px]">
                  {thread.modelName}
                </span>
                {thread.isLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                )}
                {thread.error && (
                  <AlertCircle className="w-3 h-3 text-destructive" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {threads.map((thread) => (
          <TabsContent
            key={thread.id}
            value={thread.id}
            className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden min-h-0 overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full" id={`scroll-area-${thread.id}`}>
                <div className="p-4 space-y-4">
                {thread.messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}

                {thread.isLoading &&
                  thread.messages[thread.messages.length - 1]?.role ===
                    "user" && (
                    <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg bg-muted/30 border border-border/50">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-orange-500/20"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-foreground">Generating response...</p>
                        <p className="text-xs text-muted-foreground">Please wait while the model processes your request</p>
                      </div>
                    </div>
                  )}

                {thread.error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="mt-1 text-sm">{thread.error}</p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </div>

            {/* Thread Footer - Stats (Fixed at bottom) */}
            <div className="border-t border-border bg-card/50 px-4 py-2 shrink-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>
                    {thread.stats.inputTokens.toLocaleString()} in /{" "}
                    {thread.stats.outputTokens.toLocaleString()} out
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span>${thread.stats.cost.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {thread.stats.latencyMs > 0
                      ? `${(thread.stats.latencyMs / 1000).toFixed(1)}s`
                      : "-"}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {thread.modelId}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={() => exportThread(thread.dbThreadId, "markdown")}
                  title="Export thread as Markdown"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {/* Thread Input (Fixed at bottom) */}
            <div className="shrink-0">
              <ThreadInput threadId={thread.id} />
            </div>
          </TabsContent>
        ))}
        </Tabs>
      )}
    </div>
  );
}
