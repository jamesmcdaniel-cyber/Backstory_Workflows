import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { About } from './pages/About';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Catalog />} />
          <Route path="/workflow/:id" element={<WorkflowDetail />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/api-docs/*"
            element={
              <Placeholder
                eyebrow="Developer Reference"
                title="Backstory API"
                subtitle="The read-only REST + Query API at api.people.ai — authentication, conventions, the data model, and an endpoint-by-endpoint reference."
                image="bg-06.jpg"
                items={['Overview', 'Rate limits & conventions', 'Versioning & Beta', 'Data model', 'Errors', '41 endpoints (from openapi.json)']}
              />
            }
          />
          <Route
            path="/guides/*"
            element={
              <Placeholder
                eyebrow="Setup Guides"
                title="Configure what powers your workflows"
                subtitle="Step-by-step configuration for Backstory MCP, Slack, Microsoft Teams, Google Chat, email, and cross-tool templates."
                image="bg-02.jpg"
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
                image="bg-04.jpg"
                items={['8 EDB tables', 'Board generator', 'Analytics dashboard', 'Deal Status Edition']}
              />
            }
          />
          <Route
            path="/skills"
            element={
              <Placeholder
                eyebrow="Backstory LLM Skills"
                title="Skills"
                subtitle="30 downloadable Backstory skills (SKILL.md prompts) that compose over the Backstory MCP."
                image="bg-05.jpg"
                items={['Account planning', 'MEDDPICC', 'Meeting prep', 'QBR generator', 'Multi-threading coach', '+ 25 more']}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
