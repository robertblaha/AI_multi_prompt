import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "prompt-tester.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS favorite_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS saved_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      api_key_id INTEGER REFERENCES api_keys(id),
      system_prompt TEXT,
      mode TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      model_id TEXT NOT NULL,
      iteration_number INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      tokens_input INTEGER,
      tokens_output INTEGER,
      cost REAL,
      latency_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_pricing (
      model_id TEXT PRIMARY KEY,
      prompt_price REAL NOT NULL,
      completion_price REAL NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default models if none exist
  const modelCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM favorite_models")
    .get() as { count: number };

  if (modelCount.count === 0) {
    const defaultModels = [
      { modelId: "anthropic/claude-sonnet-4", displayName: "Claude Sonnet 4", sortOrder: 1 },
      { modelId: "anthropic/claude-3.5-haiku", displayName: "Claude 3.5 Haiku", sortOrder: 2 },
      { modelId: "openai/gpt-4o", displayName: "GPT-4o", sortOrder: 3 },
      { modelId: "openai/gpt-4o-mini", displayName: "GPT-4o Mini", sortOrder: 4 },
      { modelId: "google/gemini-2.0-flash-001", displayName: "Gemini 2.0 Flash", sortOrder: 5 },
      { modelId: "meta-llama/llama-3.3-70b-instruct", displayName: "Llama 3.3 70B", sortOrder: 6 },
    ];

    const insertModel = sqlite.prepare(
      "INSERT INTO favorite_models (model_id, display_name, sort_order) VALUES (?, ?, ?)"
    );

    for (const model of defaultModels) {
      insertModel.run(model.modelId, model.displayName, model.sortOrder);
    }
  }
}

// Initialize on import
initDatabase();
