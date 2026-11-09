import type { PhotoMeta } from '../types/photo'
import { photoId } from './normalize'

/** Deterministic, synthetic metadata. Never mixed into the real library. */
export function createSamplePhotos(count = 1248): PhotoMeta[] {
  let seed = 42
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const choose = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!
  return Array.from({ length: count }, (_, i) => {
    const sony = random() < 0.78
    const focal = choose([24, 28, 35, 35, 35, 50, 50, 50, 50, 85, 85, 105, 135, 200])
    const date = new Date(
      Date.UTC(
        2025,
        Math.floor(random() * 12),
        1 + Math.floor(random() * 28),
        choose([7, 8, 9, 10, 12, 14, 15, 16, 17, 17, 17, 18, 18, 19, 20]),
      ),
    )
    const dateTaken = date.toISOString().slice(0, 19)
    const filename = `SAMPLE_${String(i + 1).padStart(5, '0')}.jpg`
    const size = 4000000 + i * 137
    return {
      id: photoId(filename, size, dateTaken),
      filename,
      size,
      cameraMake: sony ? 'Sony' : 'Fujifilm',
      cameraModel: sony ? 'α7 IV' : 'X-T5',
      lensModel: sony
        ? focal === 35
          ? 'FE 35mm F1.8'
          : focal === 50
            ? 'FE 50mm F1.4 GM'
            : 'FE 24–105mm F4 G OSS'
        : 'XF 16–80mm F4 R OIS WR',
      focalLength: focal,
      focalLength35mm: sony ? focal : focal * 1.5,
      aperture: choose([1.4, 1.8, 2, 2.8, 2.8, 4, 4, 5.6, 8, 11]),
      shutterSpeed: choose([
        1 / 2000,
        1 / 1000,
        1 / 500,
        1 / 250,
        1 / 250,
        1 / 125,
        1 / 60,
        1 / 30,
        2,
      ]),
      iso: choose([100, 100, 100, 200, 200, 400, 400, 800, 1600, 3200, 6400]),
      dateTaken,
      latitude: null,
      longitude: null,
      exposureCompensation: choose([0, 0, 0, -1 / 3, 1 / 3]),
      flashFired: false,
    }
  })
}
export const SAMPLE_PHOTOS = createSamplePhotos()
