import { Loader2 } from 'lucide-react'

// Single app-wide loader, always centred in the viewport so consecutive loading phases
// (auth hydration → lazy page chunk) show as one continuous spinner, not two.
export default function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Loader2 size={52} color="var(--primary)" strokeWidth={2.5} style={{ animation: 'page-loader-spin 0.8s linear infinite' }} />
      <style>{`@keyframes page-loader-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
