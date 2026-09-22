import type { HTMLAttributes, ReactNode } from "react"
import clsx from "clsx"

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  /** "left" adds a colored left border (the emphasis treatment used for hero/lead panels); "none" is the default flat card. */
  emphasis?: "none" | "left"
  interactive?: boolean
}

/**
 * The app's single card primitive - the border/radius/background/shadow
 * combination every redesigned page (Profile Evidence, Dashboard Home,
 * Jobs, Applications, Interviews, Countries) has been hand-matching via
 * page-scoped CSS. New pages should use this instead of redefining the
 * same four properties again.
 */
export function Card({ children, className, emphasis = "none", interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={clsx("ui-card", emphasis === "left" && "ui-card-emphasis", interactive && "ui-card-interactive", className)}
      {...rest}
    >
      {children}
    </div>
  )
}
