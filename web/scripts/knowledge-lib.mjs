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
    // Numeric entities first (covers &#34; &#39; &#8592; &#8942; etc.).
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&bull;/g, '•')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Catch-all for any remaining named entity, so no raw &word; leaks into text.
    .replace(/&[a-z][a-z0-9]{1,30};/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split a guide's HTML slice at each <h3> so a long guide becomes several
// heading-scoped chunks instead of one truncated blob. Returns [slice] when
// there are no <h3> boundaries.
function splitAtH3(slice) {
  const idxs = [];
  const re = /<h3[\s>]/gi;
  let mm;
  while ((mm = re.exec(slice))) idxs.push(mm.index);
  if (!idxs.length) return [slice];
  const parts = [];
  if (idxs[0] > 0) parts.push(slice.slice(0, idxs[0]));
  for (let j = 0; j < idxs.length; j++) {
    parts.push(slice.slice(idxs[j], j + 1 < idxs.length ? idxs[j + 1] : slice.length));
  }
  return parts;
}

// Extract each legacy setup-guide section (id="guide-*-view"). Slices run
// tag-start to tag-start (so no raw markup fragments leak). A section whose
// stripped text exceeds the guide cap is split by <h3> headings into
// guide:<id>, guide:<id>:2, guide:<id>:3 … so no guide content is lost to
// truncation. Returns [] when the legacy markup changes shape — the build
// must never fail on this.
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
  return marks.flatMap((mark, i) => {
    const start = tagStart(mark.at);
    let end;
    if (i + 1 < marks.length) {
      end = tagStart(marks[i + 1].at);
    } else {
      const nextDiv = src.indexOf('<div id="', mark.at + 1);
      // Always cap the final section so a distant/absent next div can't bleed
      // the rest of the document into the last guide chunk.
      end = Math.min(nextDiv === -1 ? src.length : nextDiv, mark.at + 60000);
    }
    const slice = src.slice(start, end);
    const h2 = slice.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2 ? stripHtml(h2[1]) : mark.id.replace(/^guide-|-view$/g, '').replace(/-/g, ' ');
    const short = mark.id.replace(/^guide-/, '').replace(/-view$/, '');
    const keywords = [...short.split('-'), 'setup', 'guide', 'integration', 'connect'];
    const base = { type: 'guide', keywords };

    const fullText = stripHtml(slice);
    if (fullText.length <= CAP.guide) {
      return [{ id: `guide:${mark.id}`, title: `Setup guide: ${title}`, text: fullText, ...base }];
    }
    const parts = splitAtH3(slice);
    if (parts.length === 1) {
      return [{ id: `guide:${mark.id}`, title: `Setup guide: ${title}`, text: truncate(fullText, CAP.guide), ...base }];
    }
    return parts.map((part, pi) => {
      const text = truncate(stripHtml(part), CAP.guide);
      if (pi === 0) return { id: `guide:${mark.id}`, title: `Setup guide: ${title}`, text, ...base };
      const h3 = part.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const sub = (h3 && stripHtml(h3[1])) || `part ${pi + 1}`;
      return { id: `guide:${mark.id}:${pi + 1}`, title: `Setup guide: ${title} — ${sub}`, text, ...base };
    });
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
