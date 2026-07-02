// Pure chunk builders for the Librarian knowledge index. No filesystem access
// here — sync-data.mjs reads the sources and passes parsed data in, so every
// builder is unit-testable. Each chunk: { id, type, title, text, keywords }.

const CAP = { workflow: 2000, signal: 2000, mcp: 800, api: 2500, guide: 4000, concept: 1500 };

const asText = (v) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

export function truncate(text, max) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function workflowChunks(workflows) {
  return (workflows || []).map((w) => {
    const platforms = Object.keys(w.platforms || {}).join(', ');
    const parts = [
      asText(w.description),
      w.trigger && `Trigger: ${asText(w.trigger)}`,
      w.output && `Output: ${asText(w.output)}`,
      w.node_flow && `How it works: ${asText(w.node_flow)}`,
      platforms && `Platforms: ${platforms}`,
    ].filter(Boolean);
    return {
      id: `workflow:${w.id}`,
      type: 'workflow',
      title: `${w.name} (Auto flow)`,
      text: truncate(parts.join('\n'), CAP.workflow),
      keywords: [w.id, w.category, 'workflow', 'auto flow', 'automation'].filter(Boolean),
    };
  });
}

export function signalChunks(skills) {
  return (skills || []).map((s) => {
    const parts = [
      asText(s.description),
      s.audience && `Audience: ${asText(s.audience)}`,
      s.input && `Input: ${asText(s.input)}`,
      Array.isArray(s.mcpTools) && s.mcpTools.length && `MCP tools used: ${s.mcpTools.join(', ')}`,
      s.walkthrough && `Walkthrough: ${asText(s.walkthrough)}`,
    ].filter(Boolean);
    return {
      id: `signal:${s.id}`,
      type: 'signal',
      title: `${s.name} (Signal)`,
      text: truncate(parts.join('\n'), CAP.signal),
      keywords: [s.id, s.category, 'signal', 'skill'].filter(Boolean),
    };
  });
}

export function mcpChunks(tools) {
  const list = tools || [];
  const overview = {
    id: 'mcp:overview',
    type: 'mcp',
    title: 'Backstory MCP overview',
    text: truncate(
      `The Backstory MCP (Model Context Protocol) server is the shared data layer under every workflow and signal. It exposes ${list.length} tools for live account, opportunity, activity, people, and company-news data: ${list.map((t) => t.name).join(', ')}.`,
      CAP.mcp,
    ),
    keywords: ['mcp', 'model context protocol', 'server', 'tools', 'backstory'],
  };
  const each = list.map((t) => ({
    id: `mcp:${t.name}`,
    type: 'mcp',
    title: `MCP tool: ${t.name}`,
    text: truncate(
      `${t.description}${t.usedBy && t.usedBy.length ? `\nUsed by: ${t.usedBy.join(', ')}` : ''}`,
      CAP.mcp,
    ),
    keywords: [t.name, 'mcp', 'tool', 'backstory mcp'],
  }));
  return [overview, ...each];
}

export function conceptChunks() {
  return [
    {
      id: 'concept:library',
      type: 'concept',
      title: 'What the Backstory Automation Library is',
      text: truncate(
        `The Backstory Automation Library is a catalogue of revenue-team automation in three layers. Workflows (browsed as "Auto flows") are scheduled agents that run on n8n, Workato, Zapier, or a Claude/OpenAI orchestrator: they trigger on a schedule or event, pull live account and deal context from Backstory over MCP, reason with an LLM, and deliver an outcome such as a Slack message, an email, a CRM update, or a brief. Signals (also called skills) are packaged instruction sets a person drops into an AI assistant to do one sales job well on demand — account planning, QBR prep, MEDDPICC qualification. The Backstory MCP server is the shared data layer both call for accounts, opportunities, activity, engaged people, and company news. The site also hosts API docs for the read-only REST + Query API at api.people.ai, and setup guides for Slack, Microsoft Teams, email, Google Chat, cross-tool delivery, and the Backstory MCP itself.`,
        CAP.concept,
      ),
      keywords: ['library', 'catalogue', 'about', 'workflows', 'signals', 'skills', 'mcp', 'overview'],
    },
  ];
}
