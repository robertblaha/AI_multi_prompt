import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, threads, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ExportMessage {
  role: string;
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  latencyMs?: number;
  createdAt: string;
}

interface ExportThread {
  modelId: string;
  iterationNumber?: number;
  messages: ExportMessage[];
  stats: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    avgLatencyMs: number;
  };
}

interface ExportSession {
  id: number;
  name?: string;
  systemPrompt?: string;
  mode: string;
  createdAt: string;
  threads: ExportThread[];
  totalStats: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    threadCount: number;
  };
}

/**
 * Generate Markdown from session data
 */
function generateMarkdown(session: ExportSession, options: { includeStats?: boolean; includeTimestamps?: boolean } = {}): string {
  const { includeStats = true, includeTimestamps = false } = options;
  let md = "";

  // Session header
  md += `# ${session.name || `Session ${session.id}`}\n\n`;
  md += `**Mode:** ${session.mode === "single_repeat" ? "Single Model Repeat" : "Multi Model"}\n`;
  md += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;

  if (session.systemPrompt) {
    md += `\n## System Prompt\n\n${session.systemPrompt}\n`;
  }

  if (includeStats) {
    md += `\n## Session Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Threads | ${session.totalStats.threadCount} |\n`;
    md += `| Input Tokens | ${session.totalStats.inputTokens.toLocaleString()} |\n`;
    md += `| Output Tokens | ${session.totalStats.outputTokens.toLocaleString()} |\n`;
    md += `| Total Cost | $${session.totalStats.cost.toFixed(4)} |\n`;
  }

  // Threads
  md += `\n## Conversations\n`;

  session.threads.forEach((thread, idx) => {
    const threadName = thread.iterationNumber 
      ? `${thread.modelId} #${thread.iterationNumber}`
      : thread.modelId;
    
    md += `\n### ${idx + 1}. ${threadName}\n\n`;

    if (includeStats) {
      md += `> 📊 Tokens: ${thread.stats.inputTokens} in / ${thread.stats.outputTokens} out | 💰 $${thread.stats.cost.toFixed(4)} | ⚡ ${(thread.stats.avgLatencyMs / 1000).toFixed(1)}s avg\n\n`;
    }

    thread.messages.forEach((msg) => {
      const roleLabel = msg.role === "user" ? "**User:**" : msg.role === "assistant" ? "**Assistant:**" : "**System:**";
      
      md += `${roleLabel}`;
      if (includeTimestamps && msg.createdAt) {
        md += ` *(${new Date(msg.createdAt).toLocaleTimeString()})*`;
      }
      md += `\n\n`;
      md += `${msg.content}\n\n`;
      md += `---\n\n`;
    });
  });

  return md;
}

/**
 * Generate HTML for PDF (printable format)
 */
function generateHTML(session: ExportSession): string {
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  };

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${session.name || `Session ${session.id}`}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #4b5563; margin-top: 25px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
    .system-prompt { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706; }
    .stats { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stats table { width: 100%; border-collapse: collapse; }
    .stats th, .stats td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .thread { margin: 30px 0; padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
    .thread-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .thread-stats { font-size: 12px; color: #6b7280; background: #f9fafb; padding: 8px 12px; border-radius: 6px; }
    .message { margin: 15px 0; padding: 15px; border-radius: 8px; }
    .message.user { background: #dbeafe; border-left: 4px solid #3b82f6; }
    .message.assistant { background: #dcfce7; border-left: 4px solid #22c55e; }
    .message.system { background: #fef3c7; border-left: 4px solid #d97706; }
    .message-role { font-weight: 600; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; }
    .message-content { white-space: pre-wrap; word-wrap: break-word; }
    @media print {
      body { padding: 0; }
      .thread { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(session.name || `Session ${session.id}`)}</h1>
  <div class="meta">
    <strong>Mode:</strong> ${session.mode === "single_repeat" ? "Single Model Repeat" : "Multi Model"} |
    <strong>Created:</strong> ${new Date(session.createdAt).toLocaleString()}
  </div>
`;

  if (session.systemPrompt) {
    html += `
  <div class="system-prompt">
    <strong>System Prompt:</strong><br>
    ${escapeHtml(session.systemPrompt)}
  </div>
`;
  }

  html += `
  <div class="stats">
    <h3 style="margin-top: 0;">Session Summary</h3>
    <table>
      <tr><th>Threads</th><td>${session.totalStats.threadCount}</td></tr>
      <tr><th>Input Tokens</th><td>${session.totalStats.inputTokens.toLocaleString()}</td></tr>
      <tr><th>Output Tokens</th><td>${session.totalStats.outputTokens.toLocaleString()}</td></tr>
      <tr><th>Total Cost</th><td>$${session.totalStats.cost.toFixed(4)}</td></tr>
    </table>
  </div>
`;

  session.threads.forEach((thread, idx) => {
    const threadName = thread.iterationNumber 
      ? `${thread.modelId} #${thread.iterationNumber}`
      : thread.modelId;

    html += `
  <div class="thread">
    <div class="thread-header">
      <h3 style="margin: 0;">${idx + 1}. ${escapeHtml(threadName)}</h3>
      <span class="thread-stats">
        📊 ${thread.stats.inputTokens}/${thread.stats.outputTokens} tokens | 💰 $${thread.stats.cost.toFixed(4)} | ⚡ ${(thread.stats.avgLatencyMs / 1000).toFixed(1)}s
      </span>
    </div>
`;

    thread.messages.forEach((msg) => {
      const roleClass = msg.role;
      const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      
      html += `
    <div class="message ${roleClass}">
      <div class="message-role">${roleLabel}</div>
      <div class="message-content">${escapeHtml(msg.content)}</div>
    </div>
`;
    });

    html += `  </div>\n`;
  });

  html += `
</body>
</html>`;

  return html;
}

/**
 * Export a single thread to Markdown
 */
function generateThreadMarkdown(thread: ExportThread, systemPrompt?: string): string {
  let md = "";

  const threadName = thread.iterationNumber 
    ? `${thread.modelId} #${thread.iterationNumber}`
    : thread.modelId;

  md += `# ${threadName}\n\n`;
  md += `> 📊 Tokens: ${thread.stats.inputTokens} in / ${thread.stats.outputTokens} out | 💰 $${thread.stats.cost.toFixed(4)} | ⚡ ${(thread.stats.avgLatencyMs / 1000).toFixed(1)}s avg\n\n`;

  if (systemPrompt) {
    md += `## System Prompt\n\n${systemPrompt}\n\n---\n\n`;
  }

  md += `## Conversation\n\n`;

  thread.messages.forEach((msg) => {
    const roleLabel = msg.role === "user" ? "**User:**" : msg.role === "assistant" ? "**Assistant:**" : "**System:**";
    md += `${roleLabel}\n\n${msg.content}\n\n---\n\n`;
  });

  return md;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const threadId = searchParams.get("threadId");
    const format = searchParams.get("format") || "markdown"; // 'markdown' | 'html' | 'json'
    const includeStats = searchParams.get("includeStats") !== "false";

    if (!sessionId && !threadId) {
      return NextResponse.json(
        { error: "sessionId or threadId is required" },
        { status: 400 }
      );
    }

    // Export single thread
    if (threadId) {
      const threadData = await db
        .select()
        .from(threads)
        .where(eq(threads.id, parseInt(threadId)))
        .all();

      if (threadData.length === 0) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, parseInt(threadId)))
        .all();

      // Get session for system prompt
      let systemPrompt: string | undefined;
      if (threadData[0].sessionId) {
        const sessionData = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, threadData[0].sessionId))
          .all();
        systemPrompt = sessionData[0]?.systemPrompt || undefined;
      }

      // Calculate stats
      const stats = threadMessages.reduce(
        (acc, msg) => ({
          inputTokens: acc.inputTokens + (msg.tokensInput || 0),
          outputTokens: acc.outputTokens + (msg.tokensOutput || 0),
          cost: acc.cost + (msg.cost || 0),
          totalLatency: acc.totalLatency + (msg.latencyMs || 0),
          count: msg.role === "assistant" ? acc.count + 1 : acc.count,
        }),
        { inputTokens: 0, outputTokens: 0, cost: 0, totalLatency: 0, count: 0 }
      );

      const exportThread: ExportThread = {
        modelId: threadData[0].modelId,
        iterationNumber: threadData[0].iterationNumber || undefined,
        messages: threadMessages.map((m) => ({
          role: m.role,
          content: m.content,
          tokensInput: m.tokensInput || undefined,
          tokensOutput: m.tokensOutput || undefined,
          cost: m.cost || undefined,
          latencyMs: m.latencyMs || undefined,
          createdAt: m.createdAt || "",
        })),
        stats: {
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          cost: stats.cost,
          avgLatencyMs: stats.count > 0 ? stats.totalLatency / stats.count : 0,
        },
      };

      if (format === "json") {
        return NextResponse.json(exportThread);
      }

      const markdown = generateThreadMarkdown(exportThread, systemPrompt);
      
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="thread-${threadId}.md"`,
        },
      });
    }

    // Export full session
    const sessionData = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, parseInt(sessionId!)))
      .all();

    if (sessionData.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.sessionId, parseInt(sessionId!)))
      .all();

    const exportThreads: ExportThread[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const thread of sessionThreads) {
      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, thread.id))
        .all();

      // Calculate stats
      const stats = threadMessages.reduce(
        (acc, msg) => ({
          inputTokens: acc.inputTokens + (msg.tokensInput || 0),
          outputTokens: acc.outputTokens + (msg.tokensOutput || 0),
          cost: acc.cost + (msg.cost || 0),
          totalLatency: acc.totalLatency + (msg.latencyMs || 0),
          count: msg.role === "assistant" ? acc.count + 1 : acc.count,
        }),
        { inputTokens: 0, outputTokens: 0, cost: 0, totalLatency: 0, count: 0 }
      );

      totalInputTokens += stats.inputTokens;
      totalOutputTokens += stats.outputTokens;
      totalCost += stats.cost;

      exportThreads.push({
        modelId: thread.modelId,
        iterationNumber: thread.iterationNumber || undefined,
        messages: threadMessages.map((m) => ({
          role: m.role,
          content: m.content,
          tokensInput: m.tokensInput || undefined,
          tokensOutput: m.tokensOutput || undefined,
          cost: m.cost || undefined,
          latencyMs: m.latencyMs || undefined,
          createdAt: m.createdAt || "",
        })),
        stats: {
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          cost: stats.cost,
          avgLatencyMs: stats.count > 0 ? stats.totalLatency / stats.count : 0,
        },
      });
    }

    const exportSession: ExportSession = {
      id: sessionData[0].id,
      name: sessionData[0].name || undefined,
      systemPrompt: sessionData[0].systemPrompt || undefined,
      mode: sessionData[0].mode,
      createdAt: sessionData[0].createdAt || "",
      threads: exportThreads,
      totalStats: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: totalCost,
        threadCount: sessionThreads.length,
      },
    };

    if (format === "json") {
      return NextResponse.json(exportSession);
    }

    if (format === "html") {
      const html = generateHTML(exportSession);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="session-${sessionId}.html"`,
        },
      });
    }

    // Default: Markdown
    const markdown = generateMarkdown(exportSession, { includeStats });
    
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="session-${sessionId}.md"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 }
    );
  }
}
