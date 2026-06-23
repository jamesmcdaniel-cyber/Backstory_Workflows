import { assetUrl } from '../lib/cn';

// Studio header: a brand painterly image under a black scrim, with a mono
// "typed" headline. The `///` eyebrow marker echoes the Backstory logo mark.
export function SectionHero({ eyebrow, title, subtitle, image, children }) {
  const img = image ? `url('${assetUrl('assets/backgrounds/' + image)}')` : 'none';
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-3xl border border-ac-light-gray px-6 py-9 text-white shadow-card sm:px-11 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(95deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.62) 50%, rgba(0,0,0,0.3) 100%), ${img}, linear-gradient(135deg, #0d0d0d 0%, #000000 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-white/65">
          <span aria-hidden className="text-white/40">///</span>
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
