// Model pricing cache
interface ModelPricing {
  promptPrice: number;  // price per token
  completionPrice: number;  // price per token
}

let pricingCache: Map<string, ModelPricing> = new Map();
let lastFetchTime: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch pricing for all models from OpenRouter
 */
export async function fetchModelPricing(): Promise<Map<string, ModelPricing>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (pricingCache.size > 0 && now - lastFetchTime < CACHE_TTL) {
    return pricingCache;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) {
      console.error("Failed to fetch model pricing:", response.status);
      return pricingCache; // Return stale cache on error
    }

    const data = await response.json();
    const newCache = new Map<string, ModelPricing>();

    for (const model of data.data || []) {
      if (model.id && model.pricing) {
        newCache.set(model.id, {
          promptPrice: parseFloat(model.pricing.prompt) || 0,
          completionPrice: parseFloat(model.pricing.completion) || 0,
        });
      }
    }

    pricingCache = newCache;
    lastFetchTime = now;
    console.log(`Cached pricing for ${newCache.size} models`);
    
    return pricingCache;
  } catch (error) {
    console.error("Error fetching model pricing:", error);
    return pricingCache; // Return stale cache on error
  }
}

/**
 * Get pricing for a specific model
 */
export async function getModelPricing(modelId: string): Promise<ModelPricing | null> {
  const cache = await fetchModelPricing();
  return cache.get(modelId) || null;
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: ModelPricing | null
): number {
  if (!pricing) return 0;
  
  const promptCost = promptTokens * pricing.promptPrice;
  const completionCost = completionTokens * pricing.completionPrice;
  
  return promptCost + completionCost;
}

/**
 * Calculate cost for a model (async version that fetches pricing if needed)
 */
export async function calculateModelCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): Promise<number> {
  const pricing = await getModelPricing(modelId);
  return calculateCost(promptTokens, completionTokens, pricing);
}
