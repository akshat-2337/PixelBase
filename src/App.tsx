import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Aperture,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Moon,
  Plus,
  Sun,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { Brand } from './components/Brand'
import { Cursor } from './components/Cursor'
import { Landing } from './features/upload/Landing'
import { UploadArea, ImportStatus } from './features/upload/UploadArea'
import { useImport } from './features/upload/useImport'
const Dashboard = lazy(() =>
  import('./features/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })),
)
import { FilterBar } from './features/filters/FilterBar'
import { ExportMenu } from './features/export/ExportMenu'
import { filterPhotos } from './lib/analytics'
import { SAMPLE_PHOTOS } from './lib/sample'
import { useLibrary } from './store/useLibrary'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'exposure', label: 'Exposure', icon: Aperture },
  { id: 'activity', label: 'Activity', icon: Timer },
  { id: 'gear', label: 'Your gear', icon: HardDrive },
]
function initialTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('pixelbase:theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}
export default function App() {
  const { photos, ready, demo, filters, importing, saving, storageError, hydrate, setDemo, clear } =
    useLibrary()
  const [theme, setTheme] = useState(initialTheme)
  const [active, setActive] = useState('overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const uploadDialog = useRef<HTMLDialogElement>(null)
  const helpDialog = useRef<HTMLDialogElement>(null)
  const { start, cancel } = useImport()
  const library = demo ? SAMPLE_PHOTOS : photos
  const filtered = useMemo(() => filterPhotos(library, filters), [library, filters])
  const hasLibrary = library.length > 0
  useEffect(() => {
    void hydrate()
  }, [hydrate])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('pixelbase:theme', theme)
    } catch {
      /* Theme remains available for this session. */
    }
  }, [theme])
  const importFiles = (files: File[]) => {
    if (!files.length) return
    uploadDialog.current?.close()
    start(files)
  }
  return (
    <>
      <Cursor />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="brand-row">
          <Brand />
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          YOUR WORKSPACE <span>LOCAL</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={hasLibrary ? `#${id}` : '#overview'}
              className={active === id ? 'active' : ''}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => {
                setActive(id)
                setMobileMenu(false)
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === 'overview' && hasLibrary && <small>{library.length.toLocaleString()}</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-library">
          <span className="workspace-label">LIBRARY</span>
          <button onClick={() => uploadDialog.current?.showModal()} disabled={!ready || importing}>
            <Plus size={16} /> Import photos <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setDemo(!demo)} disabled={!ready || importing}>
            <Aperture size={16} />
            {demo ? 'Back to your library' : 'Explore sample library'}
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="device-note">
            <span className="device-icon">
              <HardDrive size={17} />
            </span>
            <div>
              <strong>Made to stay local</strong>
              <p>Your files. Your device.</p>
            </div>
            <span className="status-dot" />
          </div>
          <div className="sidebar-actions">
            <button className="text-button" onClick={() => helpDialog.current?.showModal()}>
              <CircleHelp size={15} /> How it works
            </button>
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
          {photos.length > 0 && !demo && (
            <div className="clear-control">
              {confirmClear ? (
                <div>
                  <span>Remove saved metadata?</span>
                  <button
                    disabled={importing}
                    onClick={() => {
                      void clear()
                      setConfirmClear(false)
                    }}
                  >
                    Clear
                  </button>
                  <button onClick={() => setConfirmClear(false)}>Keep</button>
                </div>
              ) : (
                <button
                  className="text-button"
                  disabled={importing}
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 size={13} /> Clear local library
                </button>
              )}
            </div>
          )}
          <div className="version">
            PIXELBASE <span>V1.0 / ON-DEVICE</span>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <span>{demo ? 'Sample library' : 'Overview'}</span>
          </div>
          <span className="local-badge">
            <LockKeyhole size={12} /> 100% on-device
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          <div id="overview" />
          {storageError && (
            <div className="notice warning" role="alert">
              <span>{storageError}</span>
              <button className="text-button" onClick={() => void useLibrary.getState().persist()}>
                Retry save
              </button>
            </div>
          )}
          {!ready ? (
            <div className="empty-state" role="status">
              <span className="loading-ring" />
              <h1>Opening your local library…</h1>
            </div>
          ) : (
            <>
              {hasLibrary && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">LESS GUESSWORK. MORE PERSPECTIVE.</div>
                      <h1>
                        Your photography, at a glance<span>.</span>
                      </h1>
                      <p>A little perspective on the way you see the world.</p>
                    </div>
                    <div className="page-actions">
                      <ExportMenu photos={filtered} />
                      <button
                        className="button primary"
                        onClick={() => uploadDialog.current?.showModal()}
                        disabled={importing}
                      >
                        <Plus size={16} /> Import photos
                      </button>
                    </div>
                  </div>
                  {demo && (
                    <div className="notice sample-notice">
                      <span>
                        <span className="tiny-tag">SAMPLE LIBRARY</span> You're exploring 1,248
                        synthetic frames. Your own library stays separate.
                      </span>
                      <button className="text-button" onClick={() => setDemo(false)}>
                        Exit sample <X size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
              <ImportStatus onCancel={cancel} />
              {hasLibrary ? (
                <>
                  <FilterBar photos={library} count={filtered.length} />
                  <Suspense
                    fallback={
                      <div className="empty-state" role="status">
                        Preparing your charts…
                      </div>
                    }
                  >
                    <Dashboard photos={filtered} />
                  </Suspense>
                </>
              ) : (
                !importing && <Landing onFiles={importFiles} />
              )}
              {importing && !hasLibrary && (
                <div className="empty-state">
                  <span className="loading-ring" />
                  <h2>Getting to know your photography</h2>
                  <p>Your dashboard will appear as the first batch finishes.</p>
                </div>
              )}
            </>
          )}
          <footer>
            <span>Built for the way you see.</span>
            <span>
              <Check size={12} />
              {demo
                ? 'Sample data · not saved'
                : saving
                  ? 'Saving metadata…'
                  : storageError
                    ? 'Session only · export to keep a copy'
                    : 'Metadata stays on this device'}
            </span>
          </footer>
        </main>
      </div>
      <dialog ref={uploadDialog} className="upload-dialog">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">ADD TO YOUR PERSPECTIVE</span>
            <h2>Import photos</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close import"
            onClick={() => uploadDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <UploadArea onFiles={importFiles} compact />
      </dialog>
      <dialog ref={helpDialog} className="help-dialog">
        <div className="dialog-heading">
          <h2>A little more about PixelBase</h2>
          <button
            className="icon-button"
            aria-label="Close help"
            onClick={() => helpDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Choose photos or a folder. PixelBase reads the EXIF metadata in a background worker, then
          turns it into a picture of your shooting habits.
        </p>
        <h3>Your photos never leave your device.</h3>
        <p>
          Only metadata is stored in this browser's IndexedDB. Image data is never saved. No
          accounts, analytics trackers, or upload servers.
        </p>
        <h3>A few details worth knowing</h3>
        <ul>
          <li>Capture time follows your camera's clock, without timezone conversion.</li>
          <li>Files with the same name, size, and capture date are counted once.</li>
          <li>Missing EXIF is skipped. RAW support depends on the camera and file variant.</li>
          <li>Exports contain the active filtered selection, including GPS if present.</li>
          <li>Clearing browser storage removes your library. Export a copy to keep it.</li>
          <li>Use the folder picker for folders; drag and drop accepts individual files.</li>
        </ul>
      </dialog>
    </>
  )
}