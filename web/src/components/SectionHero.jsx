// Studio header: a clean, dark panel with a hairline border and a faint
// accent glow — no imagery. (`image` is accepted but unused; the painterly
// backgrounds were retired in favour of the dark "Studio" look.)
export function SectionHero({ eyebrow, title, subtitle, image, children }) {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-3xl border border-ac-light-gray px-6 py-9 text-ac-dark shadow-card sm:px-11 sm:py-10"
      style={{
        backgroundImage:
          'radial-gradient(120% 140% at 0% 0%, rgba(111,158,178,0.14) 0%, rgba(111,158,178,0) 45%), linear-gradient(135deg, #15181d 0%, #0e1013 100%)',
      }}
    >
      {eyebrow && (
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-ac-coral-dark">{eyebrow}</div>
      )}
      <h1 className="max-w-3xl text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ac-dark-secondary">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
