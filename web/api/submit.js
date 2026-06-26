const LABEL = { workflows: 'workflow', skills: 'skill' };

export function renderIssueBody({ surface, draft, persona }) {
  return [
    `**Source:** ${surface} assistant${persona ? ` · persona: ${persona}` : ''}`,
    '',
    '## Summary',
    draft.summary || '_none_',
    '',
    '## Intended tech stack',
    draft.stack || '_none_',
    '',
    '## Drafted spec',
    draft.spec || '_none_',
    '',
    '---',
    '_Filed via the Backstory catalogue liaison (External Marketplace)._',
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { surface, draft, persona } = req.body || {};
  if (!['workflows', 'skills'].includes(surface) || !draft || !draft.title) {
    return res.status(400).json({ error: 'Invalid submission' });
  }

  const repo = process.env.GITHUB_REPO || 'JamesMcDaniel04/Backstory_Workflows';
  const token = process.env.GITHUB_TOKEN;
  const title = `[Marketplace] ${draft.title}`;
  const body = renderIssueBody({ surface, draft, persona });

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
