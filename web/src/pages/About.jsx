import { SectionHero } from '../components/SectionHero';

function Badge({ children }) {
  return (
    <span className="rounded-md bg-ac-success/15 px-2 py-0.5 font-mono text-[11px] font-medium text-ac-success">{children}</span>
  );
}

export function About() {
  return (
    <div className="container-page">
      <SectionHero
        eyebrow="About"
        title="The Backstory Automation Library"
        subtitle="Reusable, implementation-ready workflow patterns for revenue teams — not one-off builds."
        image="meeting-bg-03.jpg"
      />
      <div className="surface-card max-w-3xl p-8 text-[15px] leading-7 text-ac-dark-secondary">
        <p>
          This library contains ready-to-import workflow automations that leverage the <strong className="text-ac-dark">Backstory MCP</strong>{' '}
          (Model Context Protocol) integration alongside AI models, CRM data, and communication tools to deliver
          actionable sales intelligence.
        </p>
        <p className="mt-4">
          Each workflow is packaged as a reusable pattern rather than a one-off customer build. The library combines
          validated implementations, recipes for the most common orchestration tools, and generic adaptation guidance so
          the same workflow can move across different CRM, delivery, and source-system environments.
        </p>

        <p className="mt-6 font-display font-bold text-ac-dark">Packaging strategy</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>Validated: n8n + orchestrator instructions</Badge>
          <Badge>Recipes: Make / Power Automate / Zapier</Badge>
          <Badge>Adaptable: other orchestration stacks</Badge>
        </div>

        <p className="mt-6 font-display font-bold text-ac-dark">Cross-tool template model</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Start from the workflow pattern and pick the closest validated implementation</li>
          <li>Use the recipe card if the customer is on Make, Power Automate, Zapier, or a similar orchestrator</li>
          <li>Swap equivalent connectors for CRM, delivery, notes, and data sources while preserving the workflow shape</li>
          <li>Productize the logic that repeats across customers: prompts, scoring, routing, and thresholds</li>
          <li>Keep vendor-specific steps thin so the workflow survives stack changes</li>
        </ol>

        <p className="mt-6 font-display font-bold text-ac-dark">Common system families</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><strong className="text-ac-dark">CRM / system of record:</strong> Salesforce, Dynamics 365, HubSpot, or a customer-specific CRM/data warehouse</li>
          <li><strong className="text-ac-dark">Delivery:</strong> Slack, Microsoft Teams, email, or internal queues</li>
          <li><strong className="text-ac-dark">Meeting / note sources:</strong> Google Calendar, Microsoft 365, Gong, Zoom, Otter, Fireflies, Fathom</li>
          <li><strong className="text-ac-dark">Orchestration:</strong> n8n, Make, Power Automate, Zapier, Workato, or custom code</li>
        </ul>

        <p className="mt-6">
          <strong className="text-ac-dark">Maintained by</strong> the AI Innovation Team ·{' '}
          <code className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[13px] text-ac-dark-secondary">#automation-workflows</code>
        </p>
      </div>
    </div>
  );
}
