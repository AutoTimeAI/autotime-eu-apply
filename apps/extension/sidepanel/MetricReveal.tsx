// Click/keyboard-to-reveal wrapper used around numeric metrics (fit score,
// validation counts, etc.) in the legacy section views, so sensitive-ish
// numbers aren't shown by default when the side panel is glanced at. Only
// consumed by legacy section components, so - like them - currently
// unreached since `main.tsx` sets `renderLegacyTools = false`.
import { type ReactNode, useState } from "react"

type MetricRevealProps = {
  children: ReactNode
  label?: string
}

/** Shows a "Show value" button in place of `children` until clicked (or activated via Enter/Space), then reveals `children` permanently for this render. */
export function MetricReveal({
  children,
  label = "Show value"
}: MetricRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (isRevealed) {
    return <>{children}</>
  }

  return (
    <span
      aria-label={label}
      className="metric-reveal-button"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsRevealed(true)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.stopPropagation()
          setIsRevealed(true)
        }
      }}
    >
      Show value
    </span>
  )
}
