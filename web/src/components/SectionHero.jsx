import { assetUrl } from '../lib/cn';

// Studio header: a brand painterly image under a black scrim (keeps the dark
// theme cohesive and white hero text readable), with a hairline border.
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
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-white/75">{eyebrow}</div>
      )}
      <h1 className="max-w-3xl text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">
        {title}
      </h1>
      {subtitle && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-white/85">{subtitle}</p>}
      {children}
    </div>
  );
}
