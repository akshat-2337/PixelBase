import { ArrowRight, Fingerprint, ScanLine, SlidersHorizontal } from 'lucide-react'
import { UploadArea } from './UploadArea'
import { useLibrary } from '../../store/useLibrary'

export function Landing({ onFiles }: { onFiles: (files: File[]) => void }) {
  const ready = useLibrary((state) => state.ready)
  const setDemo = useLibrary((state) => state.setDemo)
  return (
    <div className="landing">
      <div className="eyebrow">
        <span className="status-dot" /> YOUR PHOTOGRAPHY, IN PERSPECTIVE
      </div>
      <h1>
        A clearer picture
        <br />
        of <span>how you shoot.</span>
      </h1>
      <p className="landing-intro">
        Your photos hold more than memories. Discover the lenses,
        <br className="hidden md:block" /> settings, and little habits that make your work yours.
      </p>
      <div className="landing-grid">
        <UploadArea onFiles={onFiles} />
        <section className="sample-preview">
          <div className="flex justify-between items-center">
            <span className="eyebrow">A DIFFERENT KIND OF CONTACT SHEET</span>
            <span className="tiny-tag">PREVIEW</span>
          </div>
          <div className="preview-stat">
            <span>Find your focal point.</span>
            <strong>
              50<span>mm</span>
            </strong>
            <p>
              A favorite you might already know.
              <br />A pattern you haven't seen yet.
            </p>
          </div>
          <div className="mini-chart" aria-hidden="true">
            {[12, 21, 37, 65, 100, 27, 53, 17, 9].map((height, index) => (
              <div
                key={index}
                style={{ height: `${height}%` }}
                className={index === 4 ? 'active' : ''}
              />
            ))}
          </div>
          <div className="mini-axis" aria-hidden="true">
            <span>16</span>
            <span>35</span>
            <span>50</span>
            <span>85</span>
            <span>200 mm</span>
          </div>
          <button className="sample-link" onClick={() => setDemo(true)} disabled={!ready}>
            Explore a sample library <ArrowRight size={16} />
          </button>
          <p className="sample-caption">1,248 synthetic frames. No photos needed.</p>
        </section>
      </div>
      <div className="landing-principles">
        <div>
          <ScanLine size={20} />
          <h3>Small details. Bigger picture.</h3>
          <p>
            Camera, lens, exposure, and time.
            <br />
            All from the EXIF already in your files.
          </p>
        </div>
        <div>
          <SlidersHorizontal size={20} />
          <h3>Follow your curiosity.</h3>
          <p>
            Filter your library and see how your
            <br />
            shooting habits change.
          </p>
        </div>
        <div>
          <Fingerprint size={20} />
          <h3>Private by design.</h3>
          <p>
            Processed in your browser. Only metadata
            <br />
            is saved on this device.
          </p>
        </div>
      </div>
    </div>
  )
}
