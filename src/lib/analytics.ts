import type { Filters, PhotoMeta } from '../types/photo'

export interface ChartDatum {
  label: string
  count: number
  prime?: boolean
}
interface Bin {
  label: string
  min: number
  max: number
  prime?: boolean
}
export const FOCAL_BINS: Bin[] = [
  { label: '<20', min: 0, max: 20 },
  { label: '20–27', min: 20, max: 28, prime: true },
  { label: '28–34', min: 28, max: 35, prime: true },
  { label: '35–49', min: 35, max: 50, prime: true },
  { label: '50–69', min: 50, max: 70, prime: true },
  { label: '70–84', min: 70, max: 85 },
  { label: '85–104', min: 85, max: 105, prime: true },
  { label: '105–134', min: 105, max: 135 },
  { label: '135–199', min: 135, max: 200, prime: true },
  { label: '200–299', min: 200, max: 300 },
  { label: '300+', min: 300, max: Infinity },
]
export const ISO_BINS: Bin[] = [
  { label: '<100', min: 0, max: 100 },
  ...[100, 200, 400, 800, 1600, 3200, 6400].map((min) => ({
    label: String(min),
    min,
    max: min * 2,
  })),
  { label: '12800+', min: 12800, max: Infinity },
]
export const SHUTTER_BINS: Bin[] = [
  { label: '<1/2000', min: 0, max: 1 / 2000 },
  { label: '1/2000+', min: 1 / 2000, max: 1 / 500 },
  { label: '1/500+', min: 1 / 500, max: 1 / 125 },
  { label: '1/125+', min: 1 / 125, max: 1 / 30 },
  { label: '1/30+', min: 1 / 30, max: 1 },
  { label: '1s+', min: 1, max: Infinity },
]
export function percentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}
export function cameraName(photo: PhotoMeta): string {
  if (!photo.cameraModel) return photo.cameraMake ?? 'Unknown camera'
  return photo.cameraMake &&
    !photo.cameraModel.toLowerCase().includes(photo.cameraMake.toLowerCase())
    ? `${photo.cameraMake} ${photo.cameraModel}`
    : photo.cameraModel
}
export function countBy(
  photos: PhotoMeta[],
  getKey: (photo: PhotoMeta) => string | null,
): ChartDatum[] {
  const counts = new Map<string, number>()
  for (const photo of photos) {
    const key = getKey(photo)
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
export function binValues(values: (number | null)[], bins: Bin[]): ChartDatum[] {
  const data = bins.map((bin) => ({ label: bin.label, count: 0, prime: bin.prime }))
  for (const value of values) {
    if (value === null || !Number.isFinite(value) || value <= 0) continue
    const index = bins.findIndex((bin) => value >= bin.min && value < bin.max)
    const entry = data[index]
    if (entry) entry.count++
  }
  return data
}
export function focalDistribution(photos: PhotoMeta[]): ChartDatum[] {
  return binValues(
    photos.map((photo) => photo.focalLength),
    FOCAL_BINS,
  )
}
export function apertureDistribution(photos: PhotoMeta[]): ChartDatum[] {
  const stops = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]
  return binValues(
    photos.map((photo) => photo.aperture),
    [
      { label: '<f/1.4', min: 0, max: 1.4 },
      ...stops.map((min, index) => ({
        label: `f/${min}${index === stops.length - 1 ? '+' : ''}`,
        min,
        max: stops[index + 1] ?? Infinity,
      })),
    ],
  )
}
export function isoDistribution(photos: PhotoMeta[]): ChartDatum[] {
  return binValues(
    photos.map((photo) => photo.iso),
    ISO_BINS,
  )
}
export function shutterDistribution(photos: PhotoMeta[]): ChartDatum[] {
  return binValues(
    photos.map((photo) => photo.shutterSpeed),
    SHUTTER_BINS,
  )
}
export function hourlyDistribution(photos: PhotoMeta[]): ChartDatum[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    label: String(hour).padStart(2, '0'),
    count: 0,
  }))
  for (const photo of photos) {
    if (!photo.dateTaken) continue
    const entry = hours[Number(photo.dateTaken.slice(11, 13))]
    if (entry) entry.count++
  }
  return hours
}
export function monthlyDistribution(photos: PhotoMeta[]): ChartDatum[] {
  const counts = countBy(photos, (photo) => photo.dateTaken?.slice(0, 7) ?? null).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
  const first = counts[0]?.label
  const last = counts[counts.length - 1]?.label
  if (!first || !last) return []
  const start = Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1
  const end = Number(last.slice(0, 4)) * 12 + Number(last.slice(5, 7)) - 1
  // Bound expansion for corrupt camera clocks spanning many centuries.
  if (end - start > 1440) return counts
  const lookup = new Map(counts.map((item) => [item.label, item.count]))
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const month = start + i
    const label = `${String(Math.floor(month / 12)).padStart(4, '0')}-${String((month % 12) + 1).padStart(2, '0')}`
    return { label, count: lookup.get(label) ?? 0 }
  })
}
export function filterPhotos(photos: PhotoMeta[], filters: Filters): PhotoMeta[] {
  const min = filters.focalMin === '' ? null : Number(filters.focalMin)
  const max = filters.focalMax === '' ? null : Number(filters.focalMax)
  return photos.filter((photo) => {
    if (filters.camera && cameraName(photo) !== filters.camera) return false
    if (filters.lens && (photo.lensModel ?? 'Unknown lens') !== filters.lens) return false
    const day = photo.dateTaken?.slice(0, 10)
    if (filters.dateFrom && (!day || day < filters.dateFrom)) return false
    if (filters.dateTo && (!day || day > filters.dateTo)) return false
    if (min !== null && (photo.focalLength === null || photo.focalLength < min)) return false
    if (max !== null && (photo.focalLength === null || photo.focalLength > max)) return false
    return true
  })
}
export function summarize(photos: PhotoMeta[]) {
  const dated = photos.flatMap((photo) => (photo.dateTaken ? [photo.dateTaken] : [])).sort()
  return {
    total: photos.length,
    start: dated[0] ?? null,
    end: dated[dated.length - 1] ?? null,
    camera: countBy(photos, cameraName)[0] ?? null,
    lens: countBy(photos, (photo) => photo.lensModel ?? 'Unknown lens')[0] ?? null,
  }
}
export function generateInsights(photos: PhotoMeta[]): string[] {
  if (photos.length === 0) return []
  const insights: string[] = []
  const focal = photos.filter((photo) => photo.focalLength !== null)
  if (focal.length) {
    const count = focal.filter(
      (photo) => photo.focalLength! >= 35 && photo.focalLength! <= 85,
    ).length
    insights.push(`${percentage(count, focal.length)}% of your shots are between 35mm and 85mm.`)
  }
  const iso = photos.filter((photo) => photo.iso !== null)
  if (iso.length)
    insights.push(
      `You shoot above ISO 3200 in ${percentage(iso.filter((photo) => photo.iso! > 3200).length, iso.length)}% of frames.`,
    )
  const aperture = photos.filter((photo) => photo.aperture !== null)
  if (aperture.length)
    insights.push(
      `${percentage(aperture.filter((photo) => photo.aperture! < 2.8).length, aperture.length)}% of frames use an aperture wider than f/2.8.`,
    )
  const peak = hourlyDistribution(photos).sort((a, b) => b.count - a.count)[0]
  if (peak && peak.count > 0)
    insights.push(
      `${peak.label}:00–${peak.label}:59 is your busiest shooting hour, with ${peak.count.toLocaleString()} frames.`,
    )
  const lens = countBy(photos, (photo) => photo.lensModel)[0]
  if (lens)
    insights.push(
      `Your most-used lens is ${lens.label}, used in ${percentage(lens.count, photos.length)}% of all frames.`,
    )
  if (insights.length < 3)
    insights.push(
      `${photos.filter((photo) => photo.dateTaken === null).length.toLocaleString()} frames have no valid capture date.`,
    )
  if (insights.length < 3)
    insights.push(
      `${photos.filter((photo) => photo.lensModel === null).length.toLocaleString()} frames have no recorded lens model.`,
    )
  if (insights.length < 3)
    insights.push(
      `Your selection includes ${photos.length.toLocaleString()} frames across ${countBy(photos, cameraName).length} recorded camera groups.`,
    )
  return insights.slice(0, 5)
}
