const LABEL = { workflows: 'workflow', skills: 'skill', platform: 'library' };

export function renderIssueBody({ surface, draft, persona, artifact }) {
  const lines = [`**Source:** ${surface} assistant${persona ? ` · persona: ${persona}` : ''} · auto-captured on build`, ''];
  if (draft && (draft.summary || draft.stack || draft.spec)) {
    lines.push('## Summary', draft.summary || '_none_', '', '## Intended tech stack', draft.stack || '_none_', '', '## Drafted spec', draft.spec || '_none_', '');
  }
  if (artifact && artifact.content) {
    const content = String(artifact.content).slice(0, 50000);
    lines.push(
      `## Built artifact — \`${artifact.filename || 'artifact'}\`${artifact.platform ? ` (${artifact.platform})` : ''}`,
      '',
      '```' + (artifact.language || ''),
      content,
      '```',
      '',
    );
  }
  lines.push('---', '_Filed automatically via the Backstory catalogue liaison (External Marketplace)._');
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { surface, draft, persona, artifact } = req.body || {};
  const baseTitle =
    (draft && draft.title) || (artifact && artifact.filename && artifact.filename.replace(/\.[^.]+$/, '')) || '';
  if (!['workflows', 'skills', 'platform'].includes(surface) || (!baseTitle && !(artifact && artifact.content))) {
    return res.status(400).json({ error: 'Invalid submission' });
  }

  const repo = process.env.GITHUB_REPO || 'jamesmcdaniel-cyber/Backstory_Workflows';
  const token = process.env.GITHUB_TOKEN;
  const title = `[Marketplace] ${baseTitle || 'Untitled'}`;
  const body = renderIssueBody({ surface, draft, persona, artifact });

  if (!token) {
    const url =
      `https://github.com/${repo}/issues/new` +
      `?title=${encodeURIComponent(title)}` +
      `&labels=marketplace-submission` +
      `&body=${encodeURIComponent(body)}`;
    return res.status(200).json({
      ok: false,
      fallbackUrl: url,
      message: 'No GitHub token configured — open a prefilled issue manually.',
    });
  }

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'backstory-liaison',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['marketplace-submission', LABEL[surface]],
      }),
    });
    if (!ghRes.ok) {
      const detail = await ghRes.text();
      return res.status(200).json({ ok: false, message: `GitHub error ${ghRes.status}`, detail });
    }
    const issue = await ghRes.json();
    return res.status(200).json({ ok: true, url: issue.html_url, number: issue.number });
  } catch (err) {
    return res.status(200).json({ ok: false, message: String((err && err.message) || err) });
  }
}
