import { useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { AssistantHome } from './pages/AssistantHome';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Skills } from './pages/Skills';
import { SkillDetail } from './pages/SkillDetail';
import { ApiDocs } from './pages/ApiDocs';
import { McpCapabilities } from './pages/McpCapabilities';
import { assetUrl } from './lib/cn';
import waldenburgRegularUrl from './assets/fonts/kmrwaldenburg-regular.ttf';
import waldenburgMediumUrl from './assets/fonts/kmrwaldenburg-medium.ttf';
import waldenburgBoldUrl from './assets/fonts/kmrwaldenburg-bold.ttf';

// Legacy-only guides live in the single-file site at /legacy/. We embed them
// in-app (same-origin iframe) so the React shell + AI assistant persist. The
// injected CSS does two jobs: hide the legacy header (no duplicate banner),
// and re-skin the token-driven legacy page to the Backstory Design System's
// light product surface — ONLY inside this embed. The standalone legacy
// Pages site keeps its own dark :root untouched.
const LEGACY_BRAND_CSS = `
@font-face{font-family:'KMR Waldenburg';src:url('${waldenburgRegularUrl}') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'KMR Waldenburg';src:url('${waldenburgMediumUrl}') format('truetype');font-weight:500;font-display:swap}
@font-face{font-family:'KMR Waldenburg';src:url('${waldenburgBoldUrl}') format('truetype');font-weight:600 800;font-display:swap}
:root{
  --ac-coral:#447C93;--ac-coral-light:#7DACC0;--ac-coral-dark:#2B6178;--ac-salmon:#99C1D1;
  --ac-cream:#F1F2F5;--ac-warm-white:#FAFAFA;--ac-card:#FFFFFF;--ac-ink:#FFFFFF;
  --ac-dark:#171721;--ac-dark-secondary:#55555E;--ac-med-gray:#8E8E92;--ac-light-gray:#E3E3E4;
  --ac-white:#FFFFFF;--ac-success:#008859;--ac-warning:#B38F00;
  --radius:12px;
  --shadow:0 2px 6px rgba(13,26,51,.05),0 1px 2px rgba(13,26,51,.05);
  --shadow-hover:0 8px 24px rgba(13,26,51,.08),0 2px 6px rgba(13,26,51,.05);
  --wf-bg:#F1F2F5;--wf-surface:#FFFFFF;--wf-border:#E3E3E4;--wf-text:#171721;
  --wf-green:#008859;--wf-blue:#447C93;--wf-purple:#6C3E59;--wf-orange:#C05527;
  --sans:'KMR Waldenburg','Arimo','Roboto',sans-serif;
}
body{background:#FFFFFF!important;font-family:'KMR Waldenburg','Arimo','Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
.asset-preview-body{background:#FFFFFF!important}
.header{display:none!important}.header-nav,.header-actions{display:none!important}.brand-lockup{pointer-events:none!important}
`;

function LegacyEmbed({ hash }) {
  const ref = useRef(null);
  // The iframe stays hidden until it's loaded AND the brand re-skin + header
  // stripping have landed, so neither the dark theme nor the duplicate
  // banner ever flashes on screen.
  const [loaded, setLoaded] = useState(false);
  const onLoad = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc) {
        const style = doc.createElement('style');
        style.textContent = LEGACY_BRAND_CSS;
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
          <Route path="/" element={<AssistantHome />} />
          <Route path="/library" element={<Landing />} />
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
