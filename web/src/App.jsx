import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Skills } from './pages/Skills';
import { SkillDetail } from './pages/SkillDetail';
import { ApiDocs } from './pages/ApiDocs';
import { assetUrl } from './lib/cn';

// Pages still served by the legacy single-file site (copied to /legacy/ at build).
function LegacyRedirect({ hash }) {
  useEffect(() => {
    window.location.replace(assetUrl('legacy/index.html') + hash);
  }, [hash]);
  return <div className="container-page py-20 text-center text-ac-med-gray">Opening…</div>;
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
          <Route path="/guides/*" element={<LegacyRedirect hash="#/guides" />} />
          <Route path="/opp-insights" element={<LegacyRedirect hash="#/opp-insights" />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:id" element={<SkillDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
