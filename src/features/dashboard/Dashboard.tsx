import { memo, useMemo } from 'react'
import {
  Aperture,
  CalendarDays,
  Camera,
  Images,
  Lightbulb,
  MoveUpRight,
  SearchX,
} from 'lucide-react'
import { ChartCard } from '../../components/ChartCard'
import {
  apertureDistribution,
  cameraName,
  countBy,
  focalDistribution,
  generateInsights,
  hourlyDistribution,
  isoDistribution,
  monthlyDistribution,
  percentage,
  shutterDistribution,
  summarize,
} from '../../lib/analytics'
import type { PhotoMeta } from '../../types/photo'
import { useLibrary } from '../../store/useLibrary'

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value + 'Z'))
    : 'Not recorded'
}
export const Dashboard = memo(function Dashboard({ photos }: { photos: PhotoMeta[] }) {
  const reset = useLibrary((state) => state.resetFilters)
  const data = useMemo(
    () => ({
      summary: summarize(photos),
      focal: focalDistribution(photos),
      aperture: apertureDistribution(photos),
      iso: isoDistribution(photos),
      shutter: shutterDistribution(photos),
      hours: hourlyDistribution(photos),
      months: monthlyDistribution(photos),
      lenses: countBy(photos, (photo) => photo.lensModel ?? 'Unknown lens'),
      cameras: countBy(photos, cameraName),
      insights: generateInsights(photos),
    }),
    [photos],
  )
  if (!photos.length)
    return (
      <div className="empty-state">
        <SearchX size={34} />
        <h2>No frames in this selection</h2>
        <p>Try a wider date or focal length range, or reset your filters.</p>
        <button className="button secondary" onClick={reset}>
          Reset filters
        </button>
      </div>
    )
  return (
    <div className="dashboard">
      <div className="summary-grid">
        <section className="stat-card">
          <div className="stat-label">
            TOTAL PHOTOS <Images size={16} />
          </div>
          <strong className="stat-number">{data.summary.total.toLocaleString()}</strong>
          <p>
            <span className="status-dot" /> Frames in focus
          </p>
        </section>
        <section className="stat-card">
          <div className="stat-label">
            DATE RANGE <CalendarDays size={16} />
          </div>
          <strong className="stat-value date-value">{formatDate(data.summary.start)}</strong>
          <p>
            {data.summary.end
              ? `through ${formatDate(data.summary.end)}`
              : 'No valid capture dates'}
          </p>
        </section>
        <section className="stat-card">
          <div className="stat-label">
            MOST-USED CAMERA <Camera size={16} />
          </div>
          <strong className="stat-value" title={data.summary.camera?.label}>
            {data.summary.camera?.label}
          </strong>
          <p>{percentage(data.summary.camera?.count ?? 0, photos.length)}% of your frames</p>
        </section>
        <section className="stat-card">
          <div className="stat-label">
            MOST-USED LENS <Aperture size={16} />
          </div>
          <strong className="stat-value lens-value" title={data.summary.lens?.label}>
            {data.summary.lens?.label}
          </strong>
          <p>{percentage(data.summary.lens?.count ?? 0, photos.length)}% of your frames</p>
        </section>
      </div>
      <div className="section-label">
        <span>01 / YOUR PERSPECTIVE</span>
        <span>The focal lengths you come back to</span>
      </div>
      <div className="perspective-grid">
        <ChartCard
          title="Focal length"
          subtitle="Where you find your frame"
          data={data.focal}
          axis="Focal length (mm)"
          highlight
          badge={
            <span className="chart-legend">
              <i /> Common prime ranges
            </span>
          }
        />
        <section className="panel insights">
          <div className="panel-heading">
            <div>
              <span className="insight-eyebrow">
                <Lightbulb size={14} /> A FEW OBSERVATIONS
              </span>
              <h2>Your shooting signature</h2>
            </div>
            <MoveUpRight size={17} />
          </div>
          <ol>
            {data.insights.map((insight, index) => (
              <li key={insight}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{insight}</p>
              </li>
            ))}
          </ol>
          <p className="insights-note">
            Calculated from your selection. Setting percentages use frames with that field recorded.
          </p>
        </section>
      </div>
      <div id="exposure" className="section-label">
        <span>02 / THE EXPOSURE TRIANGLE</span>
        <span>Your decisions, in the details</span>
      </div>
      <div className="exposure-grid">
        <ChartCard
          title="Aperture"
          subtitle="Full-stop buckets, from wide open to stopped down"
          data={data.aperture}
          axis="Aperture (lower bound)"
        />
        <ChartCard
          title="ISO"
          subtitle="Doubling buckets · 100 = ISO 100–199"
          data={data.iso}
          axis="ISO (lower bound)"
        />
        <ChartCard
          title="Shutter speed"
          subtitle="Each bucket ends at the next label"
          data={data.shutter}
          axis="Exposure time (seconds)"
        />
      </div>
      <div id="activity" className="section-label">
        <span>03 / FINDING YOUR RHYTHM</span>
        <span>When inspiration meets the shutter</span>
      </div>
      <div className="activity-grid">
        <ChartCard
          title="Time of day"
          subtitle="Capture time as recorded by your camera"
          data={data.hours}
          axis="Hour of day (24-hour)"
        />
        <ChartCard
          title="Through the months"
          subtitle="Your photographic rhythm, year by year"
          data={data.months}
          axis="Capture month (YYYY-MM)"
        />
      </div>
      <div id="gear" className="section-label">
        <span>04 / THE TOOLS YOU TRUST</span>
        <span>What makes it out of your camera bag</span>
      </div>
      <div className="gear-grid">
        <ChartCard
          title="Lens usage"
          subtitle="Every lens in your filtered library"
          data={data.lenses}
          axis="Lens model"
          horizontal
        />
        <ChartCard
          title="Camera usage"
          subtitle="The bodies behind your work"
          data={data.cameras}
          axis="Camera model"
          horizontal
        />
      </div>
      <p className="dashboard-footnote">
        Missing settings are excluded from their distributions. Unknown cameras and lenses remain
        visible. Highlighted focal bins include common primes (24, 28, 35, 50, 85, 135mm); they do
        not identify lens type.
      </p>
    </div>
  )
})
