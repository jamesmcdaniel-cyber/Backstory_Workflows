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

export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#8592;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract each legacy setup-guide section (id="guide-*-view") as one chunk.
// Slices run marker-to-marker; the last section ends at the next top-level
// div-with-id (or a hard 60KB ceiling). Returns [] when the legacy markup
// changes shape — the build must never fail on this.
export function guideChunks(html) {
  const src = String(html ?? '');
  const re = /id="(guide-[a-z-]+-view)"/g;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ id: m[1], at: m.index });
  const tagStart = (at) => {
    const idx = src.lastIndexOf('<div', at);
    return idx === -1 ? at : idx;
  };
  return marks.map((mark, i) => {
    const start = tagStart(mark.at);
    let end;
    if (i + 1 < marks.length) {
      end = tagStart(marks[i + 1].at);
    } else {
      const nextDiv = src.indexOf('<div id="', mark.at + 1);
      end = nextDiv === -1 ? Math.min(src.length, mark.at + 60000) : nextDiv;
    }
    const slice = src.slice(start, end);
    const h2 = slice.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2 ? stripHtml(h2[1]) : mark.id.replace(/^guide-|-view$/g, '').replace(/-/g, ' ');
    const short = mark.id.replace(/^guide-/, '').replace(/-view$/, '');
    return {
      id: `guide:${mark.id}`,
      type: 'guide',
      title: `Setup guide: ${title}`,
      text: truncate(stripHtml(slice), CAP.guide),
      keywords: [...short.split('-'), 'setup', 'guide', 'integration', 'connect'],
    };
  });
}

export function apiChunks(openapi) {
  const oa = openapi || {};
  const byTag = {};
  for (const [route, ops] of Object.entries(oa.paths || {})) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (!op || typeof op !== 'object' || !['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const tag = (Array.isArray(op.tags) && op.tags[0]) || 'General';
      (byTag[tag] = byTag[tag] || []).push(
        `${method.toUpperCase()} ${route} — ${op.summary || op.operationId || ''}`.trim(),
      );
    }
  }
  const info = oa.info || {};
  const server = ((oa.servers || [])[0] || {}).url || '';
  const overview = {
    id: 'api:overview',
    type: 'api',
    title: 'Backstory API overview',
    text: truncate(
      [
        `${info.title || 'Backstory API'}${info.version ? ` (v${info.version})` : ''}${server ? ` — base URL ${server}` : ''}.`,
        info.description || '',
        Object.keys(byTag).length ? `Endpoint groups: ${Object.keys(byTag).join(', ')}.` : '',
        'Full reference lives on the API Docs page.',
      ].filter(Boolean).join(' '),
      CAP.api,
    ),
    keywords: ['api', 'rest', 'endpoints', 'authentication', 'token', 'docs', 'people.ai'],
  };
  const groups = Object.entries(byTag).map(([tag, lines]) => ({
    id: `api:${tag.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'api',
    title: `API endpoints: ${tag}`,
    text: truncate(lines.join('\n'), CAP.api),
    keywords: [tag.toLowerCase(), 'api', 'endpoint', 'rest'],
  }));
  return [overview, ...groups];
}

export function buildKnowledgeChunks({ workflows = [], skills = [], mcpTools = [], openapi = null, legacyHtml = '' } = {}) {
  const chunks = [
    ...conceptChunks(),
    ...workflowChunks(workflows),
    ...signalChunks(skills),
    ...mcpChunks(mcpTools),
    ...(openapi ? apiChunks(openapi) : []),
    ...guideChunks(legacyHtml),
  ];
  return chunks.filter((c) => c.text && c.text.length >= 40);
}
