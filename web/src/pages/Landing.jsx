import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SectionHero } from '../components/SectionHero';

const SECTIONS = [
  {
    to: '/',
    title: 'Ask the Librarian',
    description: 'The AI brain of the platform — ask anything, build workflows, talk strategy.',
    eyebrow: 'Assistant',
  },
  {
    to: '/flows',
    title: 'Auto flows',
    description: 'Ready-to-import workflow automations for revenue teams.',
    eyebrow: 'Workflows',
  },
  {
    to: '/signals',
    title: 'Signals',
    description: 'Capabilities you apply to your People.ai signals — drop a SKILL.md and run.',
    eyebrow: 'Skills',
  },
  {
    to: '/mcp',
    title: 'MCP Capabilities',
    description: 'Everything the Backstory MCP can do — the tools your agents and assistants can call.',
    eyebrow: 'MCP',
  },
  {
    to: '/api-docs',
    title: 'API Docs',
    description: 'Reference documentation for the Backstory API and integration endpoints.',
    eyebrow: 'Reference',
  },
  {
    to: '/guides',
    title: 'Setup Guides',
    description: 'Step-by-step guides for connecting Backstory to your stack.',
    eyebrow: 'Guides',
  },
];

function SectionCard({ to, title, description, eyebrow }) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-ac-light-gray bg-ac-card p-6 shadow-card no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-ac-coral hover:shadow-cardhover"
    >
      <div className="mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-ac-coral-dark">
        {eyebrow}
      </div>
      <h2 className="font-display text-[16px] font-bold leading-snug tracking-[-0.01em] text-ac-dark">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-[13.5px] leading-6 text-ac-dark-secondary">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark">
        Explore
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function Landing() {
  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Backstory"
        title="Automations, signals & MCP capabilities for your revenue team."
        subtitle="Browse ready-to-import workflows, downloadable signal skills, and the full Backstory MCP toolset — all in one place."
        image="meeting-bg-01.jpg"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <SectionCard key={s.to} {...s} />
        ))}
      </div>
    </div>
  );
}
