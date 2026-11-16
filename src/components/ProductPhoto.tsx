export function ProductPhoto({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} width={800} height={800} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  return (
    <div className={`grid place-items-center bg-line text-ink-soft ${className}`} role="img" aria-label={`${alt} (sin foto)`}>
      <svg viewBox="0 0 24 24" className="h-1/3 w-1/3 fill-none stroke-current stroke-1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m21 16-5-5-8 8" />
      </svg>
    </div>
  )
}
