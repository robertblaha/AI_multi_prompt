"use client";

import { useStore } from "@/hooks/useStore";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Send, Loader2, ChevronDown, ChevronUp, Edit3, Save, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SavedPrompt } from "@/types";

export function ChatInput() {
  const {
    systemPrompt,
    setSystemPrompt,
    userPrompt,
    setUserPrompt,
    isLoading,
    selectedKeyId,
    mode,
    selectedModelId,
    repeatCount,
    selectedModelIds,
    additionalModels,
  } = useStore();
  const { sendMessage } = useChat();
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Saved prompts state
  const [savedSystemPrompts, setSavedSystemPrompts] = useState<SavedPrompt[]>([]);
  const [savedUserPrompts, setSavedUserPrompts] = useState<SavedPrompt[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePromptType, setSavePromptType] = useState<"system" | "user">("system");
  const [savePromptName, setSavePromptName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved prompts
  useEffect(() => {
    fetchSavedPrompts();
  }, []);

  const fetchSavedPrompts = async () => {
    try {
      const [systemRes, userRes] = await Promise.all([
        fetch("/api/prompts?type=system"),
        fetch("/api/prompts?type=user"),
      ]);
      
      if (systemRes.ok) {
        const data = await systemRes.json();
        setSavedSystemPrompts(data);
      }
      if (userRes.ok) {
        const data = await userRes.json();
        setSavedUserPrompts(data);
      }
    } catch (error) {
      console.error("Failed to fetch saved prompts:", error);
    }
  };

  const handleOpenSaveDialog = (type: "system" | "user") => {
    setSavePromptType(type);
    setSavePromptName("");
    setSaveDialogOpen(true);
  };

  const handleSavePrompt = async () => {
    const content = savePromptType === "system" ? systemPrompt : userPrompt;
    if (!savePromptName.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savePromptName.trim(),
          type: savePromptType,
          content: content.trim(),
        }),
      });

      if (response.ok) {
        fetchSavedPrompts();
        setSaveDialogOpen(false);
        setSavePromptName("");
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPrompt = (prompt: SavedPrompt) => {
    if (prompt.type === "system") {
      setSystemPrompt(prompt.content);
    } else {
      setUserPrompt(prompt.content);
    }
  };

  const handleDeletePrompt = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this saved prompt?")) return;
    
    try {
      const response = await fetch(`/api/prompts?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchSavedPrompts();
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    }
  };

  // Check if we can send based on mode
  const hasValidConfig =
    mode === "single_repeat"
      ? selectedModelId && repeatCount > 0
      : selectedModelIds.length > 0 ||
        additionalModels.split(",").some((m) => m.trim().length > 0);

  const canSend = selectedKeyId && hasValidConfig && userPrompt.trim() && !isLoading;

  const handleSend = () => {
    if (canSend) {
      sendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus user input when expanded
  useEffect(() => {
    if (isExpanded) {
      userInputRef.current?.focus();
    }
  }, [isExpanded]);

  // Collapsed view - single row
  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="h-10 px-4 rounded-md border border-border/50 bg-background/30 cursor-pointer hover:bg-background/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Edit3 className="w-4 h-4" />
          <span className="text-sm">Edit prompts...</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  // Expanded view
  return (
    <div className="space-y-3">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Edit3 className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Prompts</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-6 px-2 text-xs"
        >
          <ChevronUp className="w-3 h-3 mr-1" />
          Collapse
        </Button>
      </div>

      {/* System Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="systemPrompt"
            className="text-xs font-medium text-muted-foreground"
          >
            System Prompt
          </Label>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs">
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Load
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {savedSystemPrompts.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No saved system prompts
                  </div>
                ) : (
                  savedSystemPrompts.map((prompt) => (
                    <DropdownMenuItem
                      key={prompt.id}
                      onClick={() => handleLoadPrompt(prompt)}
                      className="flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeletePrompt(prompt.id, e)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs"
              onClick={() => handleOpenSaveDialog("system")}
              disabled={!systemPrompt.trim()}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <Textarea
          id="systemPrompt"
          placeholder="You are a helpful assistant..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="min-h-[60px] max-h-[200px] resize-none overflow-y-auto bg-background/50 border-border/50 focus:border-amber-500/50 text-sm"
        />
      </div>

      {/* User Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="userPrompt" className="text-xs font-medium">
            User Prompt
          </Label>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs">
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Load
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {savedUserPrompts.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No saved user prompts
                  </div>
                ) : (
                  savedUserPrompts.map((prompt) => (
                    <DropdownMenuItem
                      key={prompt.id}
                      onClick={() => handleLoadPrompt(prompt)}
                      className="flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeletePrompt(prompt.id, e)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs"
              onClick={() => handleOpenSaveDialog("user")}
              disabled={!userPrompt.trim()}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <div className="relative">
          <Textarea
            ref={userInputRef}
            id="userPrompt"
            placeholder="Enter your message..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] max-h-[250px] resize-none overflow-y-auto pr-16 bg-background border-border focus:border-amber-500 text-sm"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {userPrompt.length > 0 && `${userPrompt.length}`}
            </span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className="h-8 w-8 p-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">⌘</kbd>{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">Enter</kbd> to send
        </p>
      </div>

      {/* Save Prompt Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Save {savePromptType === "system" ? "System" : "User"} Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="promptName">Prompt Name</Label>
              <Input
                id="promptName"
                placeholder="Enter a name for this prompt..."
                value={savePromptName}
                onChange={(e) => setSavePromptName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && savePromptName.trim()) {
                    handleSavePrompt();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Preview</Label>
              <div className="p-2 rounded-md bg-muted/50 text-sm max-h-32 overflow-auto">
                {savePromptType === "system" ? systemPrompt : userPrompt}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePrompt}
                disabled={!savePromptName.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation messages */}
      {!selectedKeyId && (
        <p className="text-xs text-amber-500">
          ⚠️ Add and select an API key to start
        </p>
      )}
      {selectedKeyId && !hasValidConfig && (
        <p className="text-xs text-amber-500">
          ⚠️ Configure model selection in the sidebar
        </p>
      )}
    </div>
  );
}
