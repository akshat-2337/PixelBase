import { get, set } from 'idb-keyval'
import type { PhotoMeta } from '../types/photo'
import { normalizeDate, photoId } from './normalize'

const KEY = 'pixelbase:metadata:v1'
const stringFields = ['cameraMake', 'cameraModel', 'lensModel'] as const
const numberFields = [
  'focalLength',
  'focalLength35mm',
  'aperture',
  'shutterSpeed',
  'iso',
  'latitude',
  'longitude',
  'exposureCompensation',
] as const
export function isPhotoMeta(value: unknown): value is PhotoMeta {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    Object.keys(p).length === 16 &&
    typeof p.id === 'string' &&
    typeof p.filename === 'string' &&
    typeof p.size === 'number' &&
    Number.isFinite(p.size) &&
    p.size >= 0 &&
    stringFields.every((key) => p[key] === null || typeof p[key] === 'string') &&
    numberFields.every(
      (key) => p[key] === null || (typeof p[key] === 'number' && Number.isFinite(p[key])),
    ) &&
    (p.dateTaken === null ||
      (typeof p.dateTaken === 'string' && normalizeDate(p.dateTaken) === p.dateTaken)) &&
    (p.flashFired === null || typeof p.flashFired === 'boolean') &&
    p.id === photoId(p.filename, p.size, p.dateTaken as string | null)
  )
}
export async function loadPhotos(): Promise<PhotoMeta[]> {
  const stored: unknown = await get(KEY)
  if (stored === undefined) return []
  if (!Array.isArray(stored) || !stored.every(isPhotoMeta))
    throw new Error('Saved metadata could not be read.')
  return stored
}
// Serialize writes so an older import can never overwrite a later clear or import.
let writeQueue: Promise<void> = Promise.resolve()
export function savePhotos(photos: PhotoMeta[]): Promise<void> {
  const next = writeQueue.catch(() => undefined).then(() => set(KEY, photos))
  writeQueue = next
  return next
}
