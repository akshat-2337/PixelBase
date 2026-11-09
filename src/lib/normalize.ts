import type { PhotoMeta } from '../types/photo'

export function rational(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.includes('/')) return rational(trimmed.split('/'))
    const number = Number(trimmed)
    return Number.isFinite(number) ? number : null
  }
  if (Array.isArray(value) && value.length === 2) {
    const numerator = rational(value[0])
    const denominator = rational(value[1])
    return numerator !== null && denominator !== null && denominator !== 0
      ? rational(numerator / denominator)
      : null
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'numerator' in value &&
    'denominator' in value
  ) {
    return rational([value.numerator, value.denominator])
  }
  return null
}
function positive(value: unknown): number | null {
  const number = rational(value)
  return number !== null && number > 0 ? number : null
}
function cleanText(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/\0/g, '').trim() || null : null
}
export function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null
    const pad = (n: number) => String(n).padStart(2, '0')
    return normalizeDate(
      `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
    )
  }
  if (typeof value !== 'string') return null
  const match =
    /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(
      value.trim(),
    )
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`
  const date = new Date(`${iso}Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === iso ? iso : null
}
export function photoId(filename: string, size: number, dateTaken: string | null): string {
  return JSON.stringify([filename, size, dateTaken])
}
export function normalizeExif(
  raw: unknown,
  file: { name: string; size: number },
): PhotoMeta | null {
  if (typeof raw !== 'object' || raw === null) return null
  const tags = raw as Record<string, unknown>
  const dateTaken = normalizeDate(tags.DateTimeOriginal) ?? normalizeDate(tags.CreateDate)
  const flash = rational(tags.Flash)
  const lat = rational(tags.latitude)
  const lon = rational(tags.longitude)
  const photo: PhotoMeta = {
    id: photoId(file.name, file.size, dateTaken),
    filename: file.name,
    size: file.size,
    cameraMake: cleanText(tags.Make),
    cameraModel: cleanText(tags.Model),
    lensModel: cleanText(tags.LensModel) ?? cleanText(tags.Lens),
    focalLength: positive(tags.FocalLength),
    focalLength35mm: positive(tags.FocalLengthIn35mmFormat),
    aperture: positive(tags.FNumber),
    shutterSpeed: positive(tags.ExposureTime),
    iso: positive(tags.ISO ?? tags.PhotographicSensitivity),
    dateTaken,
    latitude: lat !== null && Math.abs(lat) <= 90 ? lat : null,
    longitude: lon !== null && Math.abs(lon) <= 180 ? lon : null,
    exposureCompensation: rational(tags.ExposureCompensation ?? tags.ExposureBiasValue),
    flashFired: flash !== null ? (flash & 1) === 1 : null,
  }
  const useful = Object.entries(photo).some(
    ([key, value]) => !['id', 'filename', 'size'].includes(key) && value !== null,
  )
  return useful ? photo : null
}
export function mergePhotos(
  existing: PhotoMeta[],
  incoming: PhotoMeta[],
): { photos: PhotoMeta[]; duplicates: number } {
  const seen = new Set(existing.map((photo) => photo.id))
  const photos = [...existing]
  let duplicates = 0
  for (const photo of incoming) {
    if (seen.has(photo.id)) duplicates++
    else {
      seen.add(photo.id)
      photos.push(photo)
    }
  }
  return { photos, duplicates }
}
