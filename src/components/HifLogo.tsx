import { BAND, STAR } from './hif-dots'

/**
 * Hack Infra Futuro logo: the flag's star in dots on a purple band (brand-kit C1),
 * with the name in Geist Pixel. Matches brand-kit/logo/svg/hif-horizontal-light.svg.
 */

export function HifMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 70" aria-hidden className={className}>
      <g className="fill-current">
        {STAR.map(([x, y]) => (
          <circle key={`s${x}${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r={4} />
        ))}
      </g>
      <g className="fill-brand">
        {BAND.map(([x, y]) => (
          <circle key={`b${x}${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r={4} />
        ))}
      </g>
    </svg>
  )
}

export function HifLogo({ className }: { className?: string }) {
  return (
    <a
      href="/"
      aria-label="Hack Infra Futuro"
      className={`flex w-fit shrink-0 items-center gap-3 text-[#181818] no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${className ?? ''}`}
    >
      <HifMark className="size-10 shrink-0" />
      <span aria-hidden className="font-pixel text-[18px] leading-5">
        Hack Infra
        <br />
        Futuro
      </span>
    </a>
  )
}
