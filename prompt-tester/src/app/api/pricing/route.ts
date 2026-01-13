import { NextRequest, NextResponse } from "next/server";
import { fetchModelPricing, calculateCost } from "@/lib/pricing";

// GET - Get pricing for all models or calculate cost
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("model");
    const promptTokens = searchParams.get("promptTokens");
    const completionTokens = searchParams.get("completionTokens");

    const pricing = await fetchModelPricing();

    // If calculating cost for specific model
    if (modelId && promptTokens && completionTokens) {
      const modelPricing = pricing.get(modelId);
      const cost = calculateCost(
        parseInt(promptTokens),
        parseInt(completionTokens),
        modelPricing || null
      );

      return NextResponse.json({
        modelId,
        promptTokens: parseInt(promptTokens),
        completionTokens: parseInt(completionTokens),
        cost,
        pricing: modelPricing || null,
      });
    }

    // If just getting pricing for a model
    if (modelId) {
      const modelPricing = pricing.get(modelId);
      if (!modelPricing) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }
      return NextResponse.json({
        modelId,
        ...modelPricing,
      });
    }

    // Return all pricing
    const allPricing: Record<string, { promptPrice: number; completionPrice: number }> = {};
    pricing.forEach((value, key) => {
      allPricing[key] = value;
    });

    return NextResponse.json({
      count: pricing.size,
      models: allPricing,
    });
  } catch (error) {
    console.error("Pricing API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
