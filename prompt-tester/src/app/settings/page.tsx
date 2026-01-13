"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Key,
  Cpu,
  FileText,
  Edit2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { ApiKey, FavoriteModel, SavedPrompt } from "@/types";

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [models, setModels] = useState<FavoriteModel[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);

  // Model form state
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [editModelId, setEditModelId] = useState("");
  const [editModelName, setEditModelName] = useState("");

  // Prompt form state
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptType, setNewPromptType] = useState<"system" | "user">("system");
  const [newPromptCategory, setNewPromptCategory] = useState("");
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [addPromptDialogOpen, setAddPromptDialogOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editPromptName, setEditPromptName] = useState("");
  const [editPromptContent, setEditPromptContent] = useState("");
  const [editPromptCategory, setEditPromptCategory] = useState("");
  const [editPromptDialogOpen, setEditPromptDialogOpen] = useState(false);

  useEffect(() => {
    fetchApiKeys();
    fetchModels();
    fetchPrompts();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const keys = await response.json();
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
        const modelList = await response.json();
        setModels(modelList);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/prompts");
      if (response.ok) {
        const promptList = await response.json();
        setPrompts(promptList);
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
    }
  };

  // API Keys handlers
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
        fetchApiKeys();
        toast.success("API key added");
      }
    } catch (error) {
      console.error("Failed to add API key:", error);
      toast.error("Failed to add API key");
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    
    try {
      const response = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchApiKeys();
        toast.success("API key deleted");
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (response.ok) {
        fetchApiKeys();
        toast.success("Default key updated");
      }
    } catch (error) {
      console.error("Failed to set default key:", error);
    }
  };

  // Model handlers
  const handleAddModel = async () => {
    if (!newModelId.trim() || !newModelName.trim()) return;

    setIsAddingModel(true);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: newModelId.trim(),
          displayName: newModelName.trim(),
          isActive: true,
        }),
      });

      if (response.ok) {
        setNewModelId("");
        setNewModelName("");
        fetchModels();
        toast.success("Model added");
      }
    } catch (error) {
      console.error("Failed to add model:", error);
      toast.error("Failed to add model");
    } finally {
      setIsAddingModel(false);
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    
    try {
      const response = await fetch(`/api/models?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchModels();
        toast.success("Model deleted");
      }
    } catch (error) {
      console.error("Failed to delete model:", error);
      toast.error("Failed to delete model");
    }
  };

  const handleToggleModelActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch("/api/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      if (response.ok) {
        fetchModels();
      }
    } catch (error) {
      console.error("Failed to toggle model:", error);
    }
  };

  const handleMoveModel = async (id: number, direction: "up" | "down") => {
    const currentIndex = models.findIndex((m) => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= models.length) return;

    // Swap sort orders
    const newOrder = [...models];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[newIndex];
    newOrder[newIndex] = temp;

    // Create reorder array
    const reorder = newOrder.map((m, idx) => ({ id: m.id, sortOrder: idx }));

    try {
      const response = await fetch("/api/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder }),
      });
      if (response.ok) {
        fetchModels();
      }
    } catch (error) {
      console.error("Failed to reorder models:", error);
    }
  };

  const handleStartEditModel = (model: FavoriteModel) => {
    setEditingModelId(model.id);
    setEditModelId(model.modelId);
    setEditModelName(model.displayName);
  };

  const handleSaveEditModel = async () => {
    if (!editingModelId || !editModelId.trim() || !editModelName.trim()) return;

    try {
      const response = await fetch("/api/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingModelId,
          modelId: editModelId.trim(),
          displayName: editModelName.trim(),
        }),
      });

      if (response.ok) {
        setEditingModelId(null);
        fetchModels();
        toast.success("Model updated");
      }
    } catch (error) {
      console.error("Failed to update model:", error);
      toast.error("Failed to update model");
    }
  };

  // Prompt handlers
  const handleAddPrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;

    setIsAddingPrompt(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPromptName.trim(),
          type: newPromptType,
          content: newPromptContent.trim(),
          category: newPromptCategory.trim() || null,
        }),
      });

      if (response.ok) {
        setNewPromptName("");
        setNewPromptContent("");
        setNewPromptCategory("");
        setAddPromptDialogOpen(false);
        fetchPrompts();
        toast.success("Prompt saved");
      }
    } catch (error) {
      console.error("Failed to add prompt:", error);
      toast.error("Failed to save prompt");
    } finally {
      setIsAddingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: number) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    
    try {
      const response = await fetch(`/api/prompts?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchPrompts();
        toast.success("Prompt deleted");
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      toast.error("Failed to delete prompt");
    }
  };

  const handleStartEditPrompt = (prompt: SavedPrompt) => {
    setEditingPromptId(prompt.id);
    setEditPromptName(prompt.name);
    setEditPromptContent(prompt.content);
    setEditPromptCategory(prompt.category || "");
    setEditPromptDialogOpen(true);
  };

  const handleSaveEditPrompt = async () => {
    if (!editingPromptId || !editPromptName.trim() || !editPromptContent.trim()) return;

    try {
      const response = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPromptId,
          name: editPromptName.trim(),
          content: editPromptContent.trim(),
          category: editPromptCategory.trim() || null,
        }),
      });

      if (response.ok) {
        setEditingPromptId(null);
        setEditPromptDialogOpen(false);
        fetchPrompts();
        toast.success("Prompt updated");
      }
    } catch (error) {
      console.error("Failed to update prompt:", error);
      toast.error("Failed to update prompt");
    }
  };

  const systemPrompts = prompts.filter((p) => p.type === "system");
  const userPrompts = prompts.filter((p) => p.type === "user");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30">
        <div className="container max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage API keys, models, and saved prompts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prompts
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="keys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage your OpenRouter API keys. Keys are encrypted before storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new key form */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Key name (e.g., Personal, Work)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="password"
                      placeholder="API key (sk-or-...)"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddKey}
                    disabled={isAddingKey || !newKeyName || !newKeyValue}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <Separator />

                {/* Keys list */}
                {apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{key.name}</span>
                              {key.isDefault && (
                                <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {key.key}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!key.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(key.id)}
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No API keys added yet. Add your OpenRouter API key above.
                  </p>
                )}

                {/* Info */}
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-amber-500">Tip:</strong> Get your
                    OpenRouter API key at{" "}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:underline"
                    >
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-500" />
                  Favorite Models
                </CardTitle>
                <CardDescription>
                  Manage your favorite models. Use arrows to reorder, toggle to enable/disable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new model form */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Model ID (e.g., openai/gpt-4o)"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Display name (e.g., GPT-4o)"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddModel}
                    disabled={isAddingModel || !newModelId || !newModelName}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <Separator />

                {/* Models list */}
                {models.length > 0 ? (
                  <div className="space-y-2">
                    {models.map((model, index) => (
                      <div
                        key={model.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          model.isActive ? "bg-muted/50" : "bg-muted/20 opacity-60"
                        }`}
                      >
                        {editingModelId === model.id ? (
                          // Edit mode
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editModelName}
                              onChange={(e) => setEditModelName(e.target.value)}
                              className="flex-1"
                              placeholder="Display name"
                            />
                            <Input
                              value={editModelId}
                              onChange={(e) => setEditModelId(e.target.value)}
                              className="flex-1"
                              placeholder="Model ID"
                            />
                            <Button size="sm" onClick={handleSaveEditModel}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingModelId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          // Display mode
                          <>
                            <div className="flex items-center gap-3">
                              {/* Reorder buttons */}
                              <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleMoveModel(model.id, "up")}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleMoveModel(model.id, "down")}
                                  disabled={index === models.length - 1}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <div>
                                <span className="font-medium">{model.displayName}</span>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {model.modelId}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleToggleModelActive(model.id, model.isActive)
                                }
                                className={
                                  model.isActive
                                    ? "text-green-500 hover:text-green-600"
                                    : "text-muted-foreground hover:text-foreground"
                                }
                              >
                                {model.isActive ? "Active" : "Inactive"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditModel(model)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteModel(model.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No models configured. Add a model above.
                  </p>
                )}

                {/* Info */}
                <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-cyan-500">Tip:</strong> Find model IDs at{" "}
                    <a
                      href="https://openrouter.ai/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-500 hover:underline"
                    >
                      openrouter.ai/models
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-500" />
                      Saved Prompts
                    </CardTitle>
                    <CardDescription>
                      Save and manage your frequently used prompts.
                    </CardDescription>
                  </div>
                  <Dialog open={addPromptDialogOpen} onOpenChange={setAddPromptDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Prompt
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                      <DialogHeader className="shrink-0">
                        <DialogTitle>Add New Prompt</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4 overflow-y-auto flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="promptName">Name</Label>
                            <Input
                              id="promptName"
                              placeholder="My Prompt"
                              value={newPromptName}
                              onChange={(e) => setNewPromptName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="promptType">Type</Label>
                            <Select
                              value={newPromptType}
                              onValueChange={(v) => setNewPromptType(v as "system" | "user")}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="system">System</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promptCategory">Category (optional)</Label>
                          <Input
                            id="promptCategory"
                            placeholder="e.g., Code Review, Writing"
                            value={newPromptCategory}
                            onChange={(e) => setNewPromptCategory(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promptContent">Content</Label>
                          <Textarea
                            id="promptContent"
                            placeholder="Enter your prompt..."
                            value={newPromptContent}
                            onChange={(e) => setNewPromptContent(e.target.value)}
                            className="min-h-[200px] max-h-[50vh] resize-y"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
                        <Button
                          variant="outline"
                          onClick={() => setAddPromptDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddPrompt}
                          disabled={isAddingPrompt || !newPromptName || !newPromptContent}
                        >
                          {isAddingPrompt ? "Saving..." : "Save Prompt"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* System Prompts */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                    System Prompts ({systemPrompts.length})
                  </h3>
                  {systemPrompts.length > 0 ? (
                    <div className="space-y-2">
                      {systemPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="p-3 rounded-lg bg-muted/50 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{prompt.name}</span>
                                {prompt.category && (
                                  <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded">
                                    {prompt.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {prompt.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditPrompt(prompt)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeletePrompt(prompt.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No system prompts saved yet.
                    </p>
                  )}
                </div>

                <Separator />

                {/* User Prompts */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                    User Prompts ({userPrompts.length})
                  </h3>
                  {userPrompts.length > 0 ? (
                    <div className="space-y-2">
                      {userPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="p-3 rounded-lg bg-muted/50 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{prompt.name}</span>
                                {prompt.category && (
                                  <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded">
                                    {prompt.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {prompt.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditPrompt(prompt)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeletePrompt(prompt.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No user prompts saved yet.
                    </p>
                  )}
                </div>

                {/* Edit Prompt Dialog */}
                <Dialog open={editPromptDialogOpen} onOpenChange={setEditPromptDialogOpen}>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                      <DialogTitle>Edit Prompt</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4 overflow-y-auto flex-1 min-h-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editPromptName">Name</Label>
                          <Input
                            id="editPromptName"
                            value={editPromptName}
                            onChange={(e) => setEditPromptName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editPromptCategory">Category</Label>
                          <Input
                            id="editPromptCategory"
                            placeholder="Optional"
                            value={editPromptCategory}
                            onChange={(e) => setEditPromptCategory(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editPromptContent">Content</Label>
                        <Textarea
                          id="editPromptContent"
                          value={editPromptContent}
                          onChange={(e) => setEditPromptContent(e.target.value)}
                          className="min-h-[200px] max-h-[50vh] resize-y"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => setEditPromptDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEditPrompt}
                        disabled={!editPromptName || !editPromptContent}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
