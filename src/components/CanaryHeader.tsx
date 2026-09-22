import canaryLogo from '../assets/canary-foundation-logo.webp'
import './CanaryHeader.css'

export function CanaryHeader({ inactive = false }: { inactive?: boolean }) {
  return (
    <header
      className="canary-header"
      inert={inactive || undefined}
      aria-hidden={inactive || undefined}
    >
      <a className="canary-skip-link" href="#main-content">Skip to main content</a>
      <div className="canary-header-inner">
        <a
          className="canary-brand"
          href="https://canaryfoundation.org/"
          target="_blank"
          rel="noreferrer"
          aria-label="Canary Foundation home (opens in a new tab)"
        >
          <span className="canary-brand-mark">
            <img src={canaryLogo} alt="" width="36" height="36" />
          </span>
          <span>
            <strong>Canary Foundation</strong>
            <small>A future found earlier</small>
          </span>
        </a>
      </div>
    </header>
  )
}
