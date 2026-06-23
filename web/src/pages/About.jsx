import { SectionHero } from '../components/SectionHero';

export function About() {
  return (
    <div className="container-page">
      <SectionHero
        eyebrow="About"
        title="The Backstory Automation Library"
        subtitle="Reusable, implementation-ready workflow patterns for revenue teams — not one-off builds."
      />
      <div className="surface-card prose-ac max-w-3xl p-8">
        <p>
          This library contains ready-to-import workflow automations that leverage the <strong>Backstory MCP</strong>{' '}
          integration alongside AI models, CRM data, and communication tools to deliver actionable sales intelligence.
        </p>
        <p>
          Each workflow is packaged as a reusable pattern rather than a one-off customer build — combining validated
          implementations, recipes for the most common orchestration tools, and generic adaptation guidance so the same
          workflow can move across different CRM, delivery, and source-system environments.
        </p>
        <p className="mt-4">
          <strong>Packaging strategy</strong>
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-7 text-ac-dark-secondary">
          <li>Validated: n8n + orchestrator instructions</li>
          <li>Recipes: Make / Power Automate / Zapier</li>
          <li>Adaptable: other orchestration stacks</li>
        </ul>
        <p className="mt-4">
          <strong>Maintained by</strong> the AI Innovation Team · <code>#automation-workflows</code>
        </p>
      </div>
    </div>
  );
}
