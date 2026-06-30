import { useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Skills } from './pages/Skills';
import { SkillDetail } from './pages/SkillDetail';
import { ApiDocs } from './pages/ApiDocs';
import { McpCapabilities } from './pages/McpCapabilities';
import { assetUrl } from './lib/cn';

// Legacy-only guides live in the single-file site at /legacy/. We embed them
// in-app (same-origin iframe) so the React shell + AI assistant persist. The
// legacy site's entire header (banner + nav) is hidden via injected CSS so
// users see only the guide content with no duplicate Backstory banner.
function LegacyEmbed({ hash }) {
  const ref = useRef(null);
  // The iframe stays hidden until it's loaded AND its legacy header is stripped,
  // so the duplicate banner never flashes on screen before the CSS lands.
  const [loaded, setLoaded] = useState(false);
  const onLoad = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc) {
        const style = doc.createElement('style');
        style.textContent =
          '.header{display:none!important}.header-nav,.header-actions{display:none!important}.brand-lockup{pointer-events:none!important}';
        doc.head.appendChild(style);
      }
    } catch {
      /* cross-origin or not yet ready — ignore */
    }
    setLoaded(true);
  };
  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 110px)' }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.12em] text-ac-med-gray">
          Loading guide…
        </div>
      )}
      <iframe
        ref={ref}
        title="Backstory guide"
        onLoad={onLoad}
        src={assetUrl('legacy/index.html') + hash}
        className={`h-full w-full border-0 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/flows" element={<Catalog />} />
          <Route path="/workflow/:id" element={<WorkflowDetail />} />
          <Route path="/signals" element={<Skills />} />
          <Route path="/signals/:id" element={<SkillDetail />} />
          <Route path="/mcp" element={<McpCapabilities />} />
          <Route path="/about" element={<About />} />
          <Route path="/api-docs/*" element={<ApiDocs />} />
          <Route path="/guides/*" element={<LegacyEmbed hash="#/guides" />} />
          {/* Redirects for old URLs */}
          <Route path="/skills" element={<Navigate to="/signals" replace />} />
          <Route path="/skills/:id" element={<Navigate to="/signals" replace />} />
          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
