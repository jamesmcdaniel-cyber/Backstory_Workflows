// web/src/components/GlobalAssistant.jsx
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';
import { useData } from '../lib/useData';

// Page-relevant context + suggestions per route. The Librarian brain is the
// same everywhere (surface: platform); only the framing changes.
function deriveContext(pathname) {
  if (pathname.startsWith('/signals/')) {
    const id = decodeURIComponent(pathname.slice('/signals/'.length));
    return {
      pageContext: `The user is on the signal (skill) detail page for "${id}". Prefer answering about this signal — what it does, how to deploy it, and how to adapt it.`,
      suggestions: ['What does this signal do?', 'How do I deploy it?', 'Build a variant of this signal'],
    };
  }
  if (pathname === '/signals') {
    return {
      pageContext: 'The user is browsing the Signals catalog (packaged AI-assistant skills).',
      suggestions: ['What is a signal?', 'Find an account-planning signal', 'What helps with MEDDPICC?'],
    };
  }
  if (pathname === '/mcp') {
    return {
      pageContext:
        'The user is on the MCP Capabilities page. Focus on the Backstory MCP — what it is, what each tool does, and how workflows and signals use it to fetch live account/deal data.',
      suggestions: ['What can the Backstory MCP do?', 'What does ask_sales_ai_about_account do?', 'Which workflows use find_account?'],
    };
  }
  if (pathname.startsWith('/workflow/')) {
    const id = decodeURIComponent(pathname.slice('/workflow/'.length));
    return {
      pageContext: `The user is on the workflow detail page for "${id}". Prefer answering about this workflow — its platforms, setup, downloads, and how to adapt it.`,
      suggestions: ['How do I deploy this workflow?', 'Which platforms support it?', 'Build a variant of this'],
    };
  }
  if (pathname === '/flows') {
    return {
      pageContext: 'The user is browsing the Auto flows catalog (scheduled automation workflows).',
      suggestions: ['What is an Auto flow?', 'Find a renewal-risk workflow', 'How does a workflow use the MCP?'],
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
      suggestions: ['How do I set up the Slack bot?', 'What does the MCP guide cover?', 'Which guide do I need for email delivery?'],
    };
  }
  if (pathname === '/about') {
    return {
      pageContext: 'The user is on the About page for the Backstory Automation Library.',
      suggestions: ['What is the Automation Library?', 'How are workflows packaged?', 'Find a workflow for me'],
    };
  }
  return {
    pageContext: 'The user is browsing the Backstory Automation Library.',
    suggestions: ['Find a renewal-risk workflow', 'Build a Slack alert for stuck deals', 'What helps with pipeline forecasting?'],
  };
}

export function GlobalAssistant() {
  const { pathname } = useLocation();
  const { data: wf } = useData('workflows.json');
  const { data: sk } = useData('skills.json');

  const ctx = useMemo(() => deriveContext(pathname), [pathname]);
  const lookup = useMemo(() => {
    const m = {};
    (wf?.workflows || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'workflow' }));
    (sk?.skills || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'signal' }));
    return m;
  }, [wf, sk]);

  // The home page IS the Librarian — no floating widget there.
  if (pathname === '/') return null;

  return <AssistantWidget suggestions={ctx.suggestions} lookup={lookup} pageContext={ctx.pageContext} />;
}
