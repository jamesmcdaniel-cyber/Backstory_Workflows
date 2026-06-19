import { assetUrl } from '../lib/cn';

// Banner header with a brand-image background, dark scrim, and white title.
export function SectionHero({ eyebrow, title, subtitle, image, children }) {
  const img = image ? `url('${assetUrl('assets/backgrounds/' + image)}')` : 'none';
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-3xl px-6 py-9 text-white shadow-card sm:px-11 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(95deg, rgba(20,28,36,0.86) 0%, rgba(20,28,36,0.5) 55%, rgba(20,28,36,0.18) 100%), ${img}, linear-gradient(135deg,#3a4a55,#26323a)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {eyebrow && (
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-white/80">{eyebrow}</div>
      )}
      <h1 className="max-w-3xl text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">
        {title}
      </h1>
      {subtitle && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-white/90">{subtitle}</p>}
      {children}
    </div>
  );
}
