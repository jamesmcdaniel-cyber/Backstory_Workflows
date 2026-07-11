// web/src/components/GlobalAssistant.jsx
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';
import { useData } from '../lib/useData';
import { assistantContextForPath } from '../lib/assistantSuggestions';

// Page-relevant context + suggestions per route. The Librarian brain is the
// same everywhere (surface: platform); only the framing changes.
export function GlobalAssistant() {
  const { pathname } = useLocation();
  const { data: wf } = useData('workflows.json');
  const { data: sk } = useData('skills.json');

  const ctx = useMemo(() => assistantContextForPath(pathname), [pathname]);
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
