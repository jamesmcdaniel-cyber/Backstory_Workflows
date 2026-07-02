import { assetUrl } from '../lib/cn';

// Section header: a brand painterly image under a deep-petrol Horizon scrim —
// the brand's "looking out at the horizon" metaphor. The `///` eyebrow marker
// echoes the Backstory logo mark (white on dark, per the design system).
export function SectionHero({ eyebrow, title, subtitle, image, children }) {
  const img = image ? `url('${assetUrl('assets/backgrounds/' + image)}')` : 'none';
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-3xl border border-ac-light-gray px-6 py-9 text-white shadow-card sm:px-11 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(95deg, rgba(2,24,33,0.92) 0%, rgba(10,47,63,0.66) 50%, rgba(24,72,92,0.32) 100%), ${img}, linear-gradient(180deg, #18485C 0%, #021821 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
          <span aria-hidden className="text-ac-salmon">///</span>
          {eyebrow}
        </div>
      )}
      <h1 className="max-w-3xl font-display text-[23px] font-bold leading-[1.2] tracking-[-0.01em] sm:text-[27px]">
        {title}
      </h1>
      {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/85">{subtitle}</p>}
      {children}
    </div>
  );
}
