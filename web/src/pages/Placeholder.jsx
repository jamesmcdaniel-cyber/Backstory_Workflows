import { SectionHero } from '../components/SectionHero';

// Temporary page for routes still being migrated into the React app (later phases).
export function Placeholder({ eyebrow, title, subtitle, image, items = [] }) {
  return (
    <div className="container-page">
      <SectionHero eyebrow={eyebrow} title={title} subtitle={subtitle} image={image} />
      <div className="surface-card p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-ac-coral/12 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ac-coral" />
          Migrating to the new platform
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ac-dark-secondary">
          This section is being rebuilt in the new React + Tailwind + Radix platform. The content and tools are
          unchanged — they’re being ported next.
        </p>
        {items.length > 0 && (
          <ul className="mt-4 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <li
                key={it}
                className="rounded-lg border border-ac-light-gray bg-ac-warm-white px-3.5 py-2.5 font-mono text-[12.5px] text-ac-dark-secondary"
              >
                {it}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
