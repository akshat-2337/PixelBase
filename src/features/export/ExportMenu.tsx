import { Download } from 'lucide-react'
import { downloadMetadata } from '../../lib/export'
import type { PhotoMeta } from '../../types/photo'

export function ExportMenu({ photos }: { photos: PhotoMeta[] }) {
  return (
    <details className="export-menu">
      <summary className="button secondary">
        <Download size={15} /> Export
      </summary>
      <div className="export-popover">
        <p>Export {photos.length.toLocaleString()} filtered photos</p>
        <button
          disabled={!photos.length}
          onClick={(event) => {
            downloadMetadata(photos, 'csv')
            event.currentTarget.closest('details')?.removeAttribute('open')
          }}
        >
          Download CSV <span>.csv</span>
        </button>
        <button
          disabled={!photos.length}
          onClick={(event) => {
            downloadMetadata(photos, 'json')
            event.currentTarget.closest('details')?.removeAttribute('open')
          }}
        >
          Download JSON <span>.json</span>
        </button>
        <small>Includes GPS when present.</small>
      </div>
    </details>
  )
}
