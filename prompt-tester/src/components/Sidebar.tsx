"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Key, Cpu, Settings, Trash2, History, X, RefreshCw, Keyboard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ApiKey, FavoriteModel, Session } from "@/types";
import Link from "next/link";
import { ModeSelector } from "@/components/model/ModeSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const {
    apiKeys,
    setApiKeys,
    selectedKeyId,
    setSelectedKeyId,
    models,
    setModels,
    selectedModelId,
    setSelectedModelId,
    loadSession,
    clearThreads,
    currentSessionId,
  } = useStore();

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessions, setSessions] = useState<(Session & { threadCount: number })[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  // Fetch API keys, models, and sessions on mount
  useEffect(() => {
    fetchApiKeys();
    fetchModels();
    fetchSessions();
  }, []);

  // Refresh sessions list when currentSessionId changes (new session created)
  // Also refresh when threads change (new messages added)
  useEffect(() => {
    if (currentSessionId) {
      // Small delay to ensure DB write is complete
      const timeoutId = setTimeout(() => {
        fetchSessions();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [currentSessionId]);

  // Also refresh when threads are added or updated (to show updated thread counts)
  const { threads } = useStore();
  useEffect(() => {
    if (threads.length > 0 && currentSessionId) {
      // Debounce to avoid too many refreshes
      const timeoutId = setTimeout(() => {
        fetchSessions();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [threads.length, currentSessionId]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const keys: ApiKey[] = await response.json();
        setApiKeys(keys);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models");
      if (response.ok) {
        const modelList: FavoriteModel[] = await response.json();
        setModels(modelList);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;

    setIsAddingKey(true);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          key: newKeyValue.trim(),
          isDefault: apiKeys.length === 0,
        }),
      });

      if (response.ok) {
        setNewKeyName("");
        setNewKeyValue("");
        setDialogOpen(false);
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to add API key:", error);
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    try {
      const response = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const sessionList = await response.json();
        setSessions(sessionList);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const handleLoadSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to fetch session:", errorData);
        alert(`Failed to load session: ${errorData.error || response.statusText}`);
        return;
      }
      
      const sessionData = await response.json();
      console.log("Loading session:", sessionData);
      
      if (!sessionData || !sessionData.id) {
        console.error("Invalid session data:", sessionData);
        alert("Invalid session data received");
        return;
      }
      
      loadSession(sessionData);
      // Refresh sessions list to update thread counts
      fetchSessions();
    } catch (error) {
      console.error("Failed to load session:", error);
      alert(`Error loading session: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleStartEditingSession = (sessionId: number, currentName: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingName(currentName || `Session ${sessionId}`);
  };

  const handleSaveSessionName = async (sessionId: number) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          name: editingName.trim() || null,
        }),
      });

      if (response.ok) {
        fetchSessions();
      }
    } catch (error) {
      console.error("Failed to update session name:", error);
    } finally {
      setEditingSessionId(null);
      setEditingName("");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, sessionId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveSessionName(sessionId);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
      setEditingName("");
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }
    try {
      const response = await fetch(`/api/sessions?id=${sessionId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchSessions();
        if (currentSessionId === sessionId) {
          clearThreads();
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleNewSession = () => {
    clearThreads();
  };

  return (
    <aside className="w-full border-r border-border bg-card/50 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Prompt Tester
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          LLM Testing & Comparison
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* API Key Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Key className="w-4 h-4 text-amber-500" />
              API Key
            </Label>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Personal, Work, Client A"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keyValue">API Key</Label>
                    <Input
                      id="keyValue"
                      type="password"
                      placeholder="sk-or-..."
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddKey}
                    disabled={isAddingKey || !newKeyName || !newKeyValue}
                  >
                    {isAddingKey ? "Adding..." : "Add Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {apiKeys.length > 0 ? (
            <Select
              value={selectedKeyId?.toString() || ""}
              onValueChange={(value) => setSelectedKeyId(parseInt(value))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select API key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{key.name}</span>
                      {key.isDefault && (
                        <span className="ml-2 text-xs text-amber-500">
                          (default)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              No API keys added yet. Click + to add one.
            </p>
          )}

          {/* Quick actions for keys */}
          {selectedKeyId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => handleDeleteKey(selectedKeyId)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete selected key
            </Button>
          )}
        </div>

        {/* Mode & Model Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="w-4 h-4 text-cyan-500" />
            Configuration
          </Label>
          {models.length > 0 ? (
            <ModeSelector />
          ) : (
            <p className="text-sm text-muted-foreground">Loading models...</p>
          )}
        </div>

        <Separator />

        {/* Session History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4 text-purple-500" />
              Session History
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchSessions}
                className="h-6 w-6"
                title="Refresh sessions"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewSession}
                className="h-6 px-2 text-xs"
              >
                New
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>No sessions yet.</p>
                <p className="text-xs">
                  Start a conversation to automatically create and save a session.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <Input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, session.id)}
                            onBlur={() => handleSaveSessionName(session.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 text-sm font-medium px-1 py-0"
                          />
                        ) : (
                          <div
                            className="text-sm font-medium truncate cursor-text hover:text-primary"
                            onClick={(e) => handleStartEditingSession(session.id, session.name, e)}
                            title="Click to edit name"
                          >
                            {session.name || `Session ${session.id}`}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(session.createdAt).toLocaleDateString()}{" "}
                          {new Date(session.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.threadCount} thread
                          {session.threadCount !== 1 ? "s" : ""} • {session.mode}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <div className="flex items-center justify-between">
          <Link href="/settings" className="flex-1">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
          <ThemeToggle />
        </div>
        <div className="text-[10px] text-muted-foreground px-2 flex items-center gap-1">
          <Keyboard className="w-3 h-3" />
          <span>⌘+Enter: Send</span>
          <span className="mx-1">•</span>
          <span>⌘+S: Save prompt</span>
        </div>
      </div>
    </aside>
  );
}
