interface DitherProps {
  src: string
  alt?: string
  className?: string
}

export function Dither({ src, alt = "", className }: DitherProps) {
  return (
    <div className={className}>
      <img src={src} alt={alt} />
    </div>
  )
}
