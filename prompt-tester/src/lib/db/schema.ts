import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  key: text("key").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
});

export const favoriteModels = sqliteTable("favorite_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: text("model_id").notNull(),
  displayName: text("display_name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  sortOrder: integer("sort_order").default(0),
});

export const savedPrompts = sqliteTable("saved_prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'system' | 'user'
  content: text("content").notNull(),
  category: text("category"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  systemPrompt: text("system_prompt"),
  mode: text("mode").notNull(), // 'single_repeat' | 'multi_model'
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const threads = sqliteTable("threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => sessions.id),
  modelId: text("model_id").notNull(),
  iterationNumber: integer("iteration_number"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id").references(() => threads.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  attachments: text("attachments"), // JSON
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  cost: real("cost"),
  latencyMs: integer("latency_ms"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const modelPricing = sqliteTable("model_pricing", {
  modelId: text("model_id").primaryKey(),
  promptPrice: real("prompt_price").notNull(),
  completionPrice: real("completion_price").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});
