import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Skills } from './pages/Skills';
import { SkillDetail } from './pages/SkillDetail';
import { ApiDocs } from './pages/ApiDocs';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Catalog />} />
          <Route path="/workflow/:id" element={<WorkflowDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/api-docs/*" element={<ApiDocs />} />
          <Route
            path="/guides/*"
            element={
              <Placeholder
                eyebrow="Setup Guides"
                title="Configure what powers your workflows"
                subtitle="Step-by-step configuration for Backstory MCP, Slack, Microsoft Teams, Google Chat, email, and cross-tool templates."
                image="meeting-bg-02.jpg"
                items={['Backstory MCP', 'Slack', 'Microsoft Teams', 'Google Chat', 'Email (SMTP)', 'Cross-tool templates']}
              />
            }
          />
          <Route
            path="/opp-insights"
            element={
              <Placeholder
                eyebrow="Deployment Toolkit"
                title="Opportunity Insights"
                subtitle="Deploy the 8 EDB tables, the navigation board, and the analytics dashboards to any Backstory instance."
                image="meeting-bg-04.jpg"
                items={['8 EDB tables', 'Board generator', 'Analytics dashboard', 'Deal Status Edition']}
              />
            }
          />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:id" element={<SkillDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
