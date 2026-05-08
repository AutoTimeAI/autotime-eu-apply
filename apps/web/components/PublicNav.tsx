import Link from "next/link"

export function PublicNav() {
  return (
    <nav className="product-nav" aria-label="Primary">
      <Link className="dashboard-brand" href="/">
        AutoTime <span>EU Apply</span>
      </Link>
      <div>
        <Link href="/">Product</Link>
        <Link href="/pricing">Pricing</Link>
        <Link className="nav-cta" href="/login">
          Sign in
        </Link>
      </div>
    </nav>
  )
}
