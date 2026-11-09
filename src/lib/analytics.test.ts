import { describe, expect, it } from 'vitest'
import {
  apertureDistribution,
  binValues,
  cameraName,
  countBy,
  filterPhotos,
  focalDistribution,
  generateInsights,
  hourlyDistribution,
  isoDistribution,
  monthlyDistribution,
  percentage,
  shutterDistribution,
  summarize,
} from './analytics'
import { normalizeExif } from './normalize'
import { createSamplePhotos } from './sample'
import { EMPTY_FILTERS, type PhotoMeta } from '../types/photo'

function photo(patch: Partial<PhotoMeta> = {}): PhotoMeta {
  return {
    ...normalizeExif({ Make: 'Sony', Model: 'α7 IV' }, { name: 'a.jpg', size: 10 })!,
    ...patch,
  }
}
describe('analytics: counts and percentages', () => {
  it('handles zero denominators and rounds percentages', () => {
    expect(percentage(3, 4)).toBe(75)
    expect(percentage(1, 3)).toBe(33)
    expect(percentage(0, 0)).toBe(0)
  })
  it('builds camera names without repeating makes', () => {
    expect(cameraName(photo())).toBe('Sony α7 IV')
    expect(cameraName(photo({ cameraModel: 'Sony A1' }))).toBe('Sony A1')
    expect(cameraName(photo({ cameraModel: null }))).toBe('Sony')
    expect(cameraName(photo({ cameraModel: null, cameraMake: null }))).toBe('Unknown camera')
  })
  it('sorts counts, breaks ties by name, and omits null keys', () => {
    expect(
      countBy(
        [photo({ lensModel: 'B' }), photo({ lensModel: 'A' }), photo({ lensModel: 'B' }), photo()],
        (p) => p.lensModel,
      ),
    ).toEqual([
      { label: 'B', count: 2 },
      { label: 'A', count: 1 },
    ])
    expect(countBy([], cameraName)).toEqual([])
  })
})
describe('analytics: distributions', () => {
  it('uses inclusive lower and exclusive upper bin bounds; ignores missing, zero and nonfinite values', () => {
    expect(
      binValues(
        [null, NaN, Infinity, -3, 0, 1, 9.9, 10],
        [
          { label: 'low', min: 0, max: 10 },
          { label: 'high', min: 10, max: Infinity },
        ],
      ).map((x) => x.count),
    ).toEqual([2, 1])
  })
  it('bins focal lengths and highlights common prime ranges', () => {
    const result = focalDistribution(
      [19, 20, 28, 35, 50, 70, 85, 105, 135, 200, 300].map((focalLength) => photo({ focalLength })),
    )
    expect(result.map((x) => x.count)).toEqual(Array(11).fill(1))
    expect(result.find((x) => x.label === '50–69')?.prime).toBe(true)
  })
  it('bins full and fractional aperture stops', () => {
    const result = apertureDistribution(
      [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32].map((aperture) => photo({ aperture })),
    )
    expect(result.map((x) => x.count)).toEqual([1, 2, 1, 1, 1, 1, 1, 1, 1, 2])
  })
  it('uses doubling ISO buckets including extremes', () => {
    expect(
      isoDistribution(
        [50, 100, 199, 200, 3200, 6400, 12800, 25600].map((iso) => photo({ iso })),
      ).map((x) => x.count),
    ).toEqual([1, 2, 1, 0, 0, 0, 1, 1, 2])
  })
  it('bins fractional and long shutter speeds exactly at boundaries', () => {
    expect(
      shutterDistribution(
        [1 / 8000, 1 / 2000, 1 / 500, 1 / 125, 1 / 30, 1, 30].map((shutterSpeed) =>
          photo({ shutterSpeed }),
        ),
      ).map((x) => x.count),
    ).toEqual([1, 1, 1, 1, 1, 2])
  })
  it('counts camera-local hours and excludes undated photos', () => {
    const result = hourlyDistribution([
      photo({ dateTaken: '2025-01-01T23:59:59' }),
      photo({ dateTaken: '2025-01-02T00:00:00' }),
      photo(),
    ])
    expect(result).toHaveLength(24)
    expect(result[23]?.count).toBe(1)
    expect(result[0]?.count).toBe(1)
  })
  it('keeps years distinct and fills empty months', () => {
    expect(
      monthlyDistribution([
        photo({ dateTaken: '2024-12-01T12:00:00' }),
        photo({ dateTaken: '2025-02-01T12:00:00' }),
        photo(),
      ]),
    ).toEqual([
      { label: '2024-12', count: 1 },
      { label: '2025-01', count: 0 },
      { label: '2025-02', count: 1 },
    ])
    expect(monthlyDistribution([])).toEqual([])
  })
  it('bounds month expansion for extreme camera clocks', () => {
    expect(
      monthlyDistribution([
        photo({ dateTaken: '1000-01-01T00:00:00' }),
        photo({ dateTaken: '9999-01-01T00:00:00' }),
      ]),
    ).toHaveLength(2)
  })
})
describe('analytics: filters, summaries and insights', () => {
  const match = photo({ lensModel: '50mm', focalLength: 50, dateTaken: '2025-06-30T23:59:59' })
  it('applies all global filters together, inclusively', () => {
    const filters = {
      ...EMPTY_FILTERS,
      camera: 'Sony α7 IV',
      lens: '50mm',
      dateFrom: '2025-06-30',
      dateTo: '2025-06-30',
      focalMin: '50',
      focalMax: '50',
    }
    expect(filterPhotos([match, photo(), photo({ ...match, focalLength: 51 })], filters)).toEqual([
      match,
    ])
    expect(filterPhotos([match, photo()], EMPTY_FILTERS)).toHaveLength(2)
  })
  it('filters unknown fields and returns zero for inverted ranges', () => {
    expect(filterPhotos([photo(), match], { ...EMPTY_FILTERS, lens: 'Unknown lens' })).toHaveLength(
      1,
    )
    expect(filterPhotos([match], { ...EMPTY_FILTERS, focalMin: '100', focalMax: '10' })).toEqual([])
    expect(
      filterPhotos([match], { ...EMPTY_FILTERS, dateFrom: '2026-01-01', dateTo: '2024-01-01' }),
    ).toEqual([])
  })
  it('summarizes empty, missing, and out-of-order dates', () => {
    expect(summarize([])).toEqual({ total: 0, start: null, end: null, camera: null, lens: null })
    const summary = summarize([match, photo({ dateTaken: '2024-01-01T00:00:00' }), photo()])
    expect(summary.total).toBe(3)
    expect(summary.start).toBe('2024-01-01T00:00:00')
    expect(summary.end).toBe(match.dateTaken)
    expect(summary.camera?.count).toBe(3)
  })
  it('generates 3–5 insights with known-field denominators and strict ISO >3200', () => {
    const insights = generateInsights([
      photo({ focalLength: 50, iso: 3200 }),
      photo({ focalLength: 200, iso: 6400 }),
      photo(),
    ])
    expect(insights[0]).toBe('50% of your shots are between 35mm and 85mm.')
    expect(insights[1]).toContain('50%')
    expect(insights.length).toBeGreaterThanOrEqual(3)
    expect(generateInsights([photo()])).toHaveLength(3)
    expect(generateInsights([])).toEqual([])
    expect(generateInsights(createSamplePhotos(100))).toHaveLength(5)
  })
  it('aggregates more than 5000 files without losing counts', () => {
    const photos = createSamplePhotos(6000)
    expect(summarize(photos).total).toBe(6000)
    expect(focalDistribution(photos).reduce((sum, item) => sum + item.count, 0)).toBe(6000)
    expect(countBy(photos, cameraName).reduce((sum, item) => sum + item.count, 0)).toBe(6000)
  })
})
