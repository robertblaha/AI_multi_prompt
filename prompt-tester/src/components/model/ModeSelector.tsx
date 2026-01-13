"use client";

import { useStore } from "@/hooks/useStore";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Repeat, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ModeSelector() {
  const {
    mode,
    setMode,
    models,
    selectedModelId,
    setSelectedModelId,
    repeatCount,
    setRepeatCount,
    selectedModelIds,
    setSelectedModelIds,
    additionalModels,
    setAdditionalModels,
  } = useStore();

  const activeModels = models.filter((m) => m.isActive);

  const handleModelToggle = (modelId: string) => {
    if (selectedModelIds.includes(modelId)) {
      setSelectedModelIds(selectedModelIds.filter((id) => id !== modelId));
    } else {
      setSelectedModelIds([...selectedModelIds, modelId]);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Mode</Label>
      <RadioGroup value={mode} onValueChange={(value: "single_repeat" | "multi_model") => setMode(value)}>
        {/* Single Repeat Mode */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="single_repeat" id="single_repeat" />
            <Label htmlFor="single_repeat" className="flex items-center gap-2 cursor-pointer">
              <Repeat className="w-4 h-4 text-amber-500" />
              <span>One model, repeated</span>
            </Label>
          </div>
          {mode === "single_repeat" && (
            <div className="ml-6 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="model-select" className="text-xs text-muted-foreground">
                  Model (select from favorites)
                </Label>
                <Select value={selectedModelId || ""} onValueChange={setSelectedModelId}>
                  <SelectTrigger id="model-select" className="bg-background">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeModels.map((model) => (
                      <SelectItem key={model.id} value={model.modelId}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-model" className="text-xs text-muted-foreground">
                  Or enter custom model ID
                </Label>
                <Input
                  id="custom-model"
                  placeholder="e.g. anthropic/claude-3-opus"
                  value={selectedModelId && !activeModels.find(m => m.modelId === selectedModelId) ? selectedModelId : ""}
                  onChange={(e) => setSelectedModelId(e.target.value.trim() || null)}
                  className="bg-background font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Find model IDs at{" "}
                  <a 
                    href="https://openrouter.ai/models" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:underline"
                  >
                    openrouter.ai/models
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat-count" className="text-xs text-muted-foreground">
                  Repeat count (1-10)
                </Label>
                <Input
                  id="repeat-count"
                  type="number"
                  min={1}
                  max={10}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                  className="bg-background"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi Model Mode */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="multi_model" id="multi_model" />
            <Label htmlFor="multi_model" className="flex items-center gap-2 cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Multiple models</span>
            </Label>
          </div>
          {mode === "multi_model" && (
            <div className="ml-6 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Select models</Label>
                <ScrollArea className="h-32 rounded-md border border-border bg-background p-2">
                  <div className="space-y-2">
                    {activeModels.map((model) => (
                      <div key={model.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`model-${model.id}`}
                          checked={selectedModelIds.includes(model.modelId)}
                          onCheckedChange={() => handleModelToggle(model.modelId)}
                        />
                        <Label
                          htmlFor={`model-${model.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {model.displayName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional-models" className="text-xs text-muted-foreground">
                  Additional models (comma-separated IDs)
                </Label>
                <Input
                  id="additional-models"
                  placeholder="anthropic/claude-3-opus, openai/gpt-4-turbo"
                  value={additionalModels}
                  onChange={(e) => setAdditionalModels(e.target.value)}
                  className="bg-background font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Enter OpenRouter model IDs separated by commas
                </p>
              </div>
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
