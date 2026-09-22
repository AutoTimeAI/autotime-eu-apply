import Link from "next/link"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import clsx from "clsx"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

type CommonProps = {
  variant?: ButtonVariant
  children: ReactNode
  className?: string
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined
  }

type ButtonAsLink = CommonProps & {
  href: string
  target?: string
  rel?: string
}

export type ButtonProps = ButtonAsButton | ButtonAsLink

/**
 * The app's single button primitive - one place that owns what "primary",
 * "secondary", "ghost" and "danger" look like, instead of every page
 * hand-rolling its own button CSS. Renders a real Next.js `<Link>` when
 * given `href` (internal navigation stays client-routed), a plain `<a>`
 * when `href` is paired with `target="_blank"`, and a `<button>` otherwise.
 */
export function Button(props: ButtonProps) {
  const { variant = "secondary", children, className } = props
  const classes = clsx("ui-btn", `ui-btn-${variant}`, className)

  if ("href" in props && props.href) {
    const { href, target, rel } = props
    if (target === "_blank") {
      return (
        <a className={classes} href={href} rel={rel ?? "noreferrer"} target={target}>
          {children}
        </a>
      )
    }
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    )
  }

  const buttonProps = props as ButtonAsButton
  const { variant: _variant, children: _children, className: _className, href: _href, ...rest } = buttonProps
  return (
    <button className={classes} type={rest.type ?? "button"} {...rest}>
      {children}
    </button>
  )
}
