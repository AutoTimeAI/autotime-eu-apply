import { type ReactNode, useState } from "react"

type MetricRevealProps = {
  children: ReactNode
  label?: string
}

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
