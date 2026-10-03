import { useEffect, useRef, useState } from 'react'
import logo from '../assets/trans-logo.png'

// Header of the signup setup pages. On mobile it stays fixed at the top
// so only the form scrolls under it (styles: .setup-header in index.css).
export default function SetupHeader({ title, subtitle, step, steps = 3 }) {
  const headerRef = useRef(null)
  const [height, setHeight] = useState(0)

  // The fixed header's height varies with the translated text, so the spacer follows it
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={headerRef} className="setup-header">
        <div className="setup-header-card">
          <div className="setup-header-logo">
            <img src={logo} alt="Logo" />
          </div>
          <h2 className="setup-header-title">{title}</h2>
          <div className="setup-header-dots">
            {Array.from({ length: steps }).map((_, i) => (
              <span key={i} className={step >= i + 1 ? 'done' : ''} />
            ))}
          </div>
          <p className="setup-header-sub">{subtitle}</p>
        </div>
      </div>
      <div className="setup-header-spacer" style={{ height }} />
    </>
  )
}
