import { useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Skills } from './pages/Skills';
import { SkillDetail } from './pages/SkillDetail';
import { ApiDocs } from './pages/ApiDocs';
import { assetUrl } from './lib/cn';

// Legacy-only guides (Opp Insights, Setup Guides) live in the single-file site
// at /legacy/. We embed them in-app (same-origin iframe) instead of navigating
// away, so the React shell + AI assistant persist. The legacy site's own nav is
// hidden via injected CSS so users can't escape into the HTML version.
function LegacyEmbed({ hash }) {
  const ref = useRef(null);
  const hideLegacyNav = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent =
        '.header-nav,.header-actions{display:none!important}.brand-lockup{pointer-events:none!important}';
      doc.head.appendChild(style);
    } catch {
      /* cross-origin or not yet ready — ignore */
    }
  };
  return (
    <iframe
      ref={ref}
      title="Backstory guide"
      onLoad={hideLegacyNav}
      src={assetUrl('legacy/index.html') + hash}
      className="w-full border-0"
      style={{ height: 'calc(100vh - 110px)' }}
    />
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Catalog />} />
          <Route path="/workflow/:id" element={<WorkflowDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/api-docs/*" element={<ApiDocs />} />
          <Route path="/guides/*" element={<LegacyEmbed hash="#/guides" />} />
          <Route path="/opp-insights" element={<LegacyEmbed hash="#/opp-insights" />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:id" element={<SkillDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
