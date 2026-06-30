import { Leaf } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function QrStandPage() {
  const [searchParams] = useSearchParams()
  const tableNumber = searchParams.get('table') || '7'

  const menuUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `http://localhost:5173/?table=${tableNumber}`
    }
    return `${window.location.origin}/?table=${tableNumber}`
  }, [tableNumber])

  const qrImage = `/qr/table-${tableNumber}.png`

  return (
    <div className="qr-stand-shell">
      <div className="qr-stand-card">
        <header className="qr-stand-header">
          <div className="qr-stand-leaf-bg qr-stand-leaf-left" aria-hidden />
          <div className="qr-stand-leaf-bg qr-stand-leaf-right" aria-hidden />

          <div className="qr-stand-logo">
            <Leaf size={22} strokeWidth={2.2} />
          </div>
          <h1>Green House</h1>
          <p className="qr-stand-subtitle">Café &amp; Restaurant</p>
        </header>

        <div className="qr-stand-body">
          <p className="qr-stand-headline">Scan to view our Menu</p>
          <p className="qr-stand-table">Table {tableNumber}</p>

          <div className="qr-stand-code-wrap">
            <span className="qr-corner qr-corner-tl" aria-hidden>
              <Leaf size={14} />
            </span>
            <span className="qr-corner qr-corner-tr" aria-hidden>
              <Leaf size={14} />
            </span>
            <img
              src={qrImage}
              alt={`Scan to open Green House menu for table ${tableNumber}`}
              className="qr-stand-code"
              onError={(event) => {
                const target = event.currentTarget
                if (target.src.endsWith('/qr-menu.png')) return
                target.src = '/qr-menu.png'
              }}
            />
            <span className="qr-corner qr-corner-bl" aria-hidden>
              <Leaf size={14} />
            </span>
            <span className="qr-corner qr-corner-br" aria-hidden>
              <Leaf size={14} />
            </span>
          </div>

          <p className="qr-stand-hint">Point your camera to scan</p>

          <p className="qr-stand-url">{menuUrl}</p>
        </div>
      </div>

      <p className="qr-stand-print-note">
        Print one stand per table. Use <code>/qr-stand?table=7</code> for table 7. Regenerate QR codes
        after you publish your live domain.
      </p>
    </div>
  )
}
