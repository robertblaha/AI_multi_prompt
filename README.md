# Prompt Tester

Lokální webová aplikace pro testování a porovnávání výstupů LLM modelů přes OpenRouter API.

![Prompt Tester](prompt-tester/public/screenshot.png)

## Funkce

- 🔄 **Multi-model testování** - Odešlete prompt více modelům současně
- 🔁 **Opakované testování** - Testujte konzistenci odpovědí jednoho modelu
- 💬 **Pokračování v konverzaci** - Navazujte na předchozí odpovědi
- 📊 **Statistiky** - Sledujte tokeny, cenu a latenci
- 💾 **Persistence** - Automatické ukládání sessions do SQLite
- 📤 **Export** - Markdown, HTML, JSON, PDF (print)
- 🔐 **Šifrované API klíče** - AES-256-GCM encryption
- 🌓 **Dark/Light mode** - Přepínání motivu
- ⌨️ **Keyboard shortcuts** - Rychlé ovládání

## Rychlý start

```bash
cd prompt-tester
npm install
npm run dev
```

Aplikace poběží na [http://localhost:3000](http://localhost:3000)

## Instalace

### Požadavky

- Node.js 18+ 
- npm nebo yarn

### Kroky

1. **Naklonujte repozitář**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI_multi_prompt.git
   cd AI_multi_prompt/prompt-tester
   ```

2. **Nainstalujte závislosti**
   ```bash
   npm install
   ```

3. **Nastavte proměnné prostředí** (volitelné)
   ```bash
   cp .env.example .env.local
   ```
   
   Upravte `.env.local` a nastavte vlastní šifrovací klíč:
   ```
   ENCRYPTION_KEY=vygenerujte-32-znakovy-klic
   ```
   
   Vygenerovat klíč můžete pomocí:
   ```bash
   openssl rand -base64 32
   ```

4. **Spusťte vývojový server**
   ```bash
   npm run dev
   ```

5. **Otevřete aplikaci**
   
   Přejděte na [http://localhost:3000](http://localhost:3000)

6. **Přidejte API klíč**
   
   - Jděte do Settings → API Keys
   - Přidejte váš OpenRouter API klíč z [openrouter.ai/keys](https://openrouter.ai/keys)

## Použití

### Základní workflow

1. V sidebar vyberte API klíč
2. Zvolte režim:
   - **Single Repeat** - jeden model, N opakování
   - **Multi Model** - více modelů současně
3. Napište system prompt (volitelné) a user prompt
4. Stiskněte **Send** nebo `⌘+Enter`

### Keyboard shortcuts

| Zkratka | Akce |
|---------|------|
| `⌘/Ctrl + Enter` | Odeslat zprávu |
| `⌘/Ctrl + Shift + Enter` | Odeslat do všech vláken |
| `⌘/Ctrl + S` | Uložit user prompt |
| `⌘/Ctrl + Shift + S` | Uložit system prompt |

### Export

- Klikněte na **Export** v záhlaví session
- Vyberte formát: Markdown, HTML, JSON
- Nebo použijte **Print / Save as PDF**

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Jazyk**: TypeScript
- **Databáze**: SQLite (Drizzle ORM)
- **Styling**: Tailwind CSS v4
- **UI komponenty**: shadcn/ui
- **State management**: Zustand
- **API**: OpenRouter

## Struktura projektu

```
prompt-tester/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── settings/     # Settings page
│   │   └── page.tsx      # Main page
│   ├── components/       # React components
│   │   ├── chat/         # Chat components
│   │   ├── model/        # Model selector
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities & DB
│   └── types/            # TypeScript types
├── data/                 # SQLite database (gitignored)
└── public/               # Static assets
```

## Licence

MIT

## Autor

Vytvořeno pro ladění promptů a testování LLM modelů.
