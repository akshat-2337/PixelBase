/** Metadata only. Capture dates preserve camera-local wall time. */
export interface PhotoMeta {
  id: string
  filename: string
  size: number
  cameraMake: string | null
  cameraModel: string | null
  lensModel: string | null
  focalLength: number | null
  focalLength35mm: number | null
  aperture: number | null
  shutterSpeed: number | null
  iso: number | null
  dateTaken: string | null
  latitude: number | null
  longitude: number | null
  exposureCompensation: number | null
  flashFired: boolean | null
}
export interface Filters {
  camera: string
  lens: string
  dateFrom: string
  dateTo: string
  focalMin: string
  focalMax: string
}
export const EMPTY_FILTERS: Filters = {
  camera: '',
  lens: '',
  dateFrom: '',
  dateTo: '',
  focalMin: '',
  focalMax: '',
}
export interface ImportProgress {
  processed: number
  total: number
  added: number
  duplicates: number
  skipped: number
  errors: number
}
export type WorkerRequest = { type: 'batch'; files: File[] }
export type WorkerResponse =
  | { type: 'progress'; processed: number; skipped: number; errors: number }
  | { type: 'batch-complete'; photos: PhotoMeta[]; skipped: number; errors: number }
