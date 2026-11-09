import { useMemo } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { cameraName, countBy } from '../../lib/analytics'
import { useLibrary } from '../../store/useLibrary'
import type { PhotoMeta } from '../../types/photo'

export function FilterBar({ photos, count }: { photos: PhotoMeta[]; count: number }) {
  const filters = useLibrary((state) => state.filters)
  const setFilters = useLibrary((state) => state.setFilters)
  const reset = useLibrary((state) => state.resetFilters)
  const cameras = useMemo(() => countBy(photos, cameraName), [photos])
  const lenses = useMemo(
    () => countBy(photos, (photo) => photo.lensModel ?? 'Unknown lens'),
    [photos],
  )
  const active = Object.values(filters).some(Boolean)
  const invalidDates = filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
  const invalidFocal =
    filters.focalMin && filters.focalMax && Number(filters.focalMin) > Number(filters.focalMax)
  return (
    <section className="filter-section" aria-label="Global filters">
      <div className="filter-heading">
        <span>
          <SlidersHorizontal size={14} /> FILTER LIBRARY
        </span>
        <span>
          {count.toLocaleString()} of {photos.length.toLocaleString()} photos
        </span>
      </div>
      <div className="filter-grid">
        <label>
          Camera
          <select
            value={filters.camera}
            onChange={(event) => setFilters({ camera: event.target.value })}
          >
            <option value="">All cameras</option>
            {cameras.map((item) => (
              <option key={item.label}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Lens
          <select
            value={filters.lens}
            onChange={(event) => setFilters({ lens: event.target.value })}
          >
            <option value="">All lenses</option>
            {lenses.map((item) => (
              <option key={item.label}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            aria-invalid={!!invalidDates}
            onChange={(event) => setFilters({ dateFrom: event.target.value })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            aria-invalid={!!invalidDates}
            onChange={(event) => setFilters({ dateTo: event.target.value })}
          />
        </label>
        <fieldset>
          <legend>Focal length (mm)</legend>
          <div className="range-inputs">
            <input
              aria-label="Minimum focal length"
              type="number"
              min="0"
              placeholder="Min"
              value={filters.focalMin}
              aria-invalid={!!invalidFocal}
              onChange={(event) => setFilters({ focalMin: event.target.value })}
            />
            <span>–</span>
            <input
              aria-label="Maximum focal length"
              type="number"
              min="0"
              placeholder="Max"
              value={filters.focalMax}
              aria-invalid={!!invalidFocal}
              onChange={(event) => setFilters({ focalMax: event.target.value })}
            />
          </div>
        </fieldset>
        <button
          className="reset-button"
          onClick={reset}
          disabled={!active}
          aria-label="Reset all filters"
          title="Reset all filters"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {(invalidDates || invalidFocal) && (
        <p className="filter-error" role="alert">
          The start of a range must be before its end.
        </p>
      )}
    </section>
  )
}
