# Prompt Tester - Specifikace aplikace

## Přehled projektu

Vytvoř lokální webovou aplikaci pro testování a porovnávání výstupů LLM modelů přes OpenRouter API. Aplikace umožňuje odesílat jeden prompt současně více modelům nebo opakovaně stejnému modelu za účelem:
- Ladění promptů pro produkční nasazení v ERP systému
- Hledání optimálního (nejlevnějšího) modelu pro daný úkol
- Testování konzistence výstupů
- Brainstorming a oponentura návrhů pomocí více modelů

## Tech Stack

- **Framework**: Next.js 14+ s App Router
- **Jazyk**: TypeScript
- **Databáze**: SQLite (via better-sqlite3 nebo Drizzle ORM) - portable, bez nutnosti externího serveru
- **Styling**: Tailwind CSS
- **UI komponenty**: shadcn/ui
- **State management**: Zustand nebo React Context
- **API komunikace**: OpenRouter API (https://openrouter.ai/api/v1/chat/completions)

## Struktura databáze

### Tabulky

```sql
-- API klíče (více klíčů pro různé zákazníky/projekty)
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,           -- např. "Zákazník ABC", "Osobní"
  key TEXT NOT NULL,            -- zašifrovaný API klíč
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_default BOOLEAN DEFAULT FALSE
);

-- Často používané modely
CREATE TABLE favorite_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,       -- OpenRouter model ID, např. "anthropic/claude-3.5-sonnet"
  display_name TEXT NOT NULL,   -- zobrazované jméno
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- Uložené prompty (systémové i uživatelské)
CREATE TABLE saved_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'system' | 'user'
  content TEXT NOT NULL,
  category TEXT,                -- volitelná kategorie pro organizaci
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (jedna session = jedno hromadné odeslání)
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,                    -- volitelný název session
  api_key_id INTEGER REFERENCES api_keys(id),
  system_prompt TEXT,
  mode TEXT NOT NULL,           -- 'single_repeat' | 'multi_model'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jednotlivá vlákna/konverzace v rámci session
CREATE TABLE threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  iteration_number INTEGER,     -- pro single_repeat mode (1, 2, 3...)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Zprávy v jednotlivých vláknech
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,           -- 'user' | 'assistant'
  content TEXT NOT NULL,
  attachments TEXT,             -- JSON pole příloh (base64 nebo cesty)
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost REAL,                    -- náklady za zprávu
  latency_ms INTEGER,           -- doba odpovědi
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Hlavní funkcionality

### 1. Správa API klíčů
- CRUD operace pro API klíče
- Každý klíč má název/kód pro identifikaci
- Možnost označit výchozí klíč
- Klíče ukládat šifrovaně (AES-256)
- Před každou novou session možnost vybrat/změnit aktivní klíč

### 2. Správa modelů
- Seznam oblíbených modelů s možností editace
- Drag & drop řazení
- Možnost deaktivovat model (nezobrazí se v nabídce)
- Předvyplnit populární modely:
  - anthropic/claude-3.5-sonnet
  - anthropic/claude-3-haiku
  - openai/gpt-4o
  - openai/gpt-4o-mini
  - google/gemini-pro-1.5
  - meta-llama/llama-3.1-70b-instruct

### 3. Správa uložených promptů
- Ukládání systémových a uživatelských promptů
- Kategorizace promptů
- Rychlý výběr z uložených při zadávání

### 4. Hlavní rozhraní pro zadávání

#### Layout
- Levý panel: výběr režimu, modelu/modelů, API klíče
- Hlavní oblast: systémový prompt, uživatelský prompt, přílohy
- Tlačítko "Odeslat"

#### Režim výběru (dropdown/radio)
1. **Jeden model opakovaně**
   - Dropdown pro výběr modelu
   - Number input pro počet opakování (1-10)
   
2. **Více modelů současně**
   - Checkboxy s oblíbenými modely
   - Textové pole pro další modely (čárkou oddělené OpenRouter ID)

#### Vstupní pole
- Systémový prompt: textarea s možností výběru z uložených
- Uživatelský prompt: textarea s možností výběru z uložených
- Přílohy: drag & drop zóna pro soubory (obrázky, dokumenty)

### 5. Zobrazení výsledků

#### Tab-based interface
- Každé vlákno = samostatná záložka
- Název záložky: název modelu (+ číslo iterace pro opakování)
- Barevné rozlišení záložek podle stavu (loading, complete, error)

#### Obsah záložky
- Chat-like zobrazení konverzace
- Možnost pokračovat v chatu (input field + send button)

#### Zápatí vlákna - Token & Cost Tracker
Každé vlákno má persistentní zápatí (footer bar) zobrazující:
- **Tokeny**: vstupní / výstupní / celkem (kumulativně za celé vlákno)
- **Cena**: kumulativní cena v USD za celé vlákno
- **Latence**: průměrná latence odpovědí

Formát zobrazení:
```
📊 Tokens: 1,234 in / 2,567 out / 3,801 total | 💰 Cost: $0.0142 | ⚡ Avg latency: 1.2s
```

Data se aktualizují v reálném čase po každé odpovědi modelu.

#### Hromadné akce
- Tlačítko "Odeslat do všech vláken" - odešle stejnou zprávu do všech aktivních konverzací
- Tlačítko "Porovnat odpovědi" - zobrazí side-by-side porovnání posledních odpovědí

#### Session Summary Bar (záhlaví nad záložkami)
Souhrnné statistiky za celou session (všechna vlákna):
```
📊 Session total: 12,450 tokens | 💰 $0.0523 | 🔄 4 threads | ⏱️ 2m 15s
```
Kliknutím se rozbalí detailní breakdown po vláknech/modelech.

### 6. Ukládání a export

#### Automatické ukládání
- Každá session se automaticky ukládá do DB
- Seznam předchozích sessions v postranním panelu

#### Export
- Export vlákna do Markdown
- Export vlákna do PDF (via react-pdf nebo podobné)
- Export celé session (všechna vlákna)

### 7. Nastavení
- Správa API klíčů
- Správa oblíbených modelů
- Správa uložených promptů
- Výchozí systémový prompt
- Téma (light/dark)

## API Integrace - OpenRouter

### Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers
```typescript
{
  "Authorization": `Bearer ${apiKey}`,
  "HTTP-Referer": "http://localhost:3000",
  "X-Title": "Prompt Tester",
  "Content-Type": "application/json"
}
```

### Request body
```typescript
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": true  // pro streaming odpovědí
}
```

### Streaming
- Implementovat streaming odpovědí pro lepší UX
- Použít Server-Sent Events nebo fetch streaming

### Získávání informací o tokenech a cenách

#### Response usage data
OpenRouter vrací v každé odpovědi pole `usage`:
```typescript
{
  "usage": {
    "prompt_tokens": 125,
    "completion_tokens": 430,
    "total_tokens": 555
  }
}
```

#### Získání cen modelů
Endpoint pro seznam modelů s cenami:
```
GET https://openrouter.ai/api/v1/models
```

Response obsahuje pro každý model:
```typescript
{
  "id": "anthropic/claude-3.5-sonnet",
  "pricing": {
    "prompt": "0.000003",    // cena za 1 token vstupu v USD
    "completion": "0.000015" // cena za 1 token výstupu v USD
  }
}
```

#### Implementace cost trackeru
1. **Při startu aplikace**: Stáhnout a cachovat ceník modelů (refresh 1x denně)
2. **Po každé odpovědi**: 
   - Získat `usage` z response
   - Vypočítat cenu: `(prompt_tokens * pricing.prompt) + (completion_tokens * pricing.completion)`
   - Aktualizovat kumulativní statistiky vlákna
3. **Uložení do DB**: Ukládat tokeny a cenu ke každé zprávě

#### Tabulka pro cache cen
```sql
CREATE TABLE model_pricing (
  model_id TEXT PRIMARY KEY,
  prompt_price REAL NOT NULL,      -- cena za token vstupu
  completion_price REAL NOT NULL,  -- cena za token výstupu
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Komponenta ThreadFooter
```typescript
interface ThreadStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  messageCount: number;
}
```

Komponenta se updatuje real-time během streamingu (tokeny) a po dokončení (finální cena).

## Struktura projektu

```
prompt-tester/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Hlavní stránka
│   │   ├── layout.tsx
│   │   ├── settings/
│   │   │   └── page.tsx          # Nastavení
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts      # Proxy pro OpenRouter
│   │       ├── keys/
│   │       │   └── route.ts      # CRUD API klíčů
│   │       ├── models/
│   │       │   └── route.ts      # CRUD modelů
│   │       ├── prompts/
│   │       │   └── route.ts      # CRUD promptů
│   │       ├── sessions/
│   │       │   └── route.ts      # CRUD sessions
│   │       ├── pricing/
│   │       │   └── route.ts      # Cache a refresh cen modelů
│   │       └── export/
│   │           └── route.ts      # Export do MD/PDF
│   ├── components/
│   │   ├── ui/                   # shadcn komponenty
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatThread.tsx
│   │   │   └── ThreadFooter.tsx  # Statistiky tokenů a ceny
│   │   ├── prompt/
│   │   │   ├── PromptForm.tsx
│   │   │   └── PromptSelector.tsx
│   │   ├── model/
│   │   │   ├── ModelSelector.tsx
│   │   │   └── ModelCheckboxList.tsx
│   │   └── session/
│   │       ├── SessionTabs.tsx
│   │       └── SessionHistory.tsx
│   ├── lib/
│   │   ├── db.ts                 # SQLite connection
│   │   ├── openrouter.ts         # OpenRouter API client
│   │   ├── pricing.ts            # Načítání a cache cen modelů
│   │   ├── encryption.ts         # Šifrování API klíčů
│   │   └── export.ts             # Export utilities
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useModels.ts
│   │   ├── usePricing.ts         # Hook pro ceny a výpočet nákladů
│   │   ├── useThreadStats.ts     # Hook pro statistiky vlákna
│   │   └── useSession.ts
│   └── types/
│       └── index.ts
├── drizzle/                      # DB migrace
├── data/
│   └── prompt-tester.db          # SQLite databáze
├── .env.local                    # Lokální proměnné (encryption key)
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Konfigurace

### .env.local
```env
# Šifrovací klíč pro API klíče (vygenerovat při prvním spuštění)
ENCRYPTION_KEY=your-32-byte-key-here

# Databáze
DATABASE_URL=file:./data/prompt-tester.db
```

### Výchozí modely (seed data)
```typescript
const defaultModels = [
  { model_id: "anthropic/claude-sonnet-4", display_name: "Claude Sonnet 4", sort_order: 1 },
  { model_id: "anthropic/claude-3.5-haiku", display_name: "Claude 3.5 Haiku", sort_order: 2 },
  { model_id: "openai/gpt-4o", display_name: "GPT-4o", sort_order: 3 },
  { model_id: "openai/gpt-4o-mini", display_name: "GPT-4o Mini", sort_order: 4 },
  { model_id: "google/gemini-2.0-flash-001", display_name: "Gemini 2.0 Flash", sort_order: 5 },
  { model_id: "meta-llama/llama-3.3-70b-instruct", display_name: "Llama 3.3 70B", sort_order: 6 },
];
```

## UX/UI požadavky

- Responzivní design (primárně desktop)
- Dark/light mode
- Keyboard shortcuts:
  - `Cmd/Ctrl + Enter` - odeslat prompt
  - `Cmd/Ctrl + Shift + Enter` - odeslat do všech vláken
  - `Cmd/Ctrl + S` - uložit prompt
- Loading states s animací
- Toast notifikace pro akce
- Konfirmační dialogy pro destruktivní akce

## Priorita implementace

### Fáze 1 - MVP
1. Základní layout a routing
2. Správa API klíčů (bez šifrování)
3. Zadání promptu a odeslání jednomu modelu
4. Zobrazení odpovědi

### Fáze 2 - Core funkcionalita
5. Multi-model a repeat režimy
6. Paralelní volání API
7. Tab-based zobrazení vláken
8. Pokračování v konverzaci

### Fáze 3 - Persistence
9. SQLite integrace
10. Ukládání sessions a promptů
11. Historie sessions

### Fáze 4 - Polish
12. Export do Markdown/PDF
13. Šifrování API klíčů
14. Správa oblíbených modelů
15. Dark mode, keyboard shortcuts

## Poznámky pro implementaci

- Použít `Promise.allSettled()` pro paralelní volání API (aby selhání jednoho nezabilo ostatní)
- Implementovat retry logiku pro API volání
- Cachovat seznam modelů z OpenRouter API
- **Cachovat ceny modelů** - stáhnout při startu, refreshovat 1x denně nebo manuálně
- **Při streamingu** - tokeny se aktualizují průběžně, finální cena se dopočítá po dokončení
- Pro streaming použít `ReadableStream` a `TextDecoder`
- SQLite databázi umístit do `data/` složky v rootu projektu
- Přidat `.gitignore` pro `data/*.db` a `.env.local`
