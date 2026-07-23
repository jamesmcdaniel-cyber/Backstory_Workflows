// Starter prompts should read like something a person would naturally ask the
// Assistant. Keep every option as a complete, user-voiced question rather than
// mixing navigation labels, commands, and questions.
// Keep this to three concise prompts so they fit on a single row under the
// composer on the home surface.
export const HOME_SUGGESTIONS = [
  'Which template generates meeting briefs?',
  'What can I do with Backstory MCP?',
  'Which skills turn account plans into actionable insights?',
];

export function assistantContextForPath(pathname) {
  if (pathname.startsWith('/signals/')) {
    const id = decodeURIComponent(pathname.slice('/signals/'.length));
    return {
      pageContext: `The user is on the signal (skill) detail page for "${id}". Prefer answering about this signal — what it does, how to deploy it, and how to adapt it.`,
      suggestions: ['What does this signal do?', 'How do I deploy this signal?', 'How can I adapt this signal?'],
    };
  }
  if (pathname === '/signals') {
    return {
      pageContext: 'The user is browsing the Signals catalog (packaged AI-assistant skills).',
      suggestions: ['What is a signal?', 'Which signal helps with account planning?', 'Which signal helps with MEDDPICC?'],
    };
  }
  if (pathname === '/mcp') {
    return {
      pageContext:
        'The user is on the MCP Capabilities page. Focus on the Backstory MCP — what it is, what each tool does, and how workflows and signals use it to fetch live account/deal data.',
      suggestions: ['What can I do with Backstory MCP?', 'What does ask_sales_ai_about_account do?', 'Which workflows use find_account?'],
    };
  }
  if (pathname.startsWith('/workflow/')) {
    const id = decodeURIComponent(pathname.slice('/workflow/'.length));
    return {
      pageContext: `The user is on the workflow detail page for "${id}". Prefer answering about this workflow — its platforms, setup, downloads, and how to adapt it.`,
      suggestions: ['How do I deploy this workflow?', 'Which platforms support this workflow?', 'How can I adapt this workflow?'],
    };
  }
  if (pathname === '/flows') {
    return {
      pageContext: 'The user is browsing the Auto flows catalog (scheduled automation workflows).',
      suggestions: ['What is an Auto flow?', 'Which workflow helps with renewal risk?', 'How do workflows use Backstory MCP?'],
    };
  }
  if (pathname.startsWith('/api-docs')) {
    return {
      pageContext:
        'The user is reading the Backstory API docs (read-only REST + Query API at api.people.ai). Help with authentication, endpoints, pagination, the data model, and errors.',
      suggestions: ['How do I authenticate?', 'How does pagination work?', 'Which endpoint returns engagement?'],
    };
  }
  if (pathname.startsWith('/guides')) {
    return {
      pageContext: 'The user is reading the Setup Guides (Slack, Teams, email, Google Chat, cross-tool, Backstory MCP).',
      suggestions: ['How do I connect Slack?', 'What does Backstory MCP setup require?', 'Which guide covers email delivery?'],
    };
  }
  if (pathname === '/about') {
    return {
      pageContext: 'The user is on the About page for the Backstory Automation Library.',
      suggestions: ['What is the Backstory Automation Library?', 'How are workflows packaged?', 'Which workflow fits my use case?'],
    };
  }
  return {
    pageContext: 'The user is browsing the Backstory Automation Library.',
    suggestions: ['Which workflow helps with renewal risk?', 'How can I build a Slack alert for at-risk deals?', 'Which workflow helps with pipeline forecasting?'],
  };
}
