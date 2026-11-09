import { describe, expect, it } from 'vitest'
import { mergePhotos, normalizeDate, normalizeExif, photoId, rational } from './normalize'
import { isPhotoMeta } from './persistence'
import { isSupportedFile } from './fileTypes'
import { createSamplePhotos } from './sample'
import { CSV_FIELDS, toCsv } from './export'

describe('EXIF normalization', () => {
  it.each([
    [1 / 125, 0.008],
    ['1/125', 0.008],
    [[1, 125], 0.008],
    [{ numerator: 1, denominator: 125 }, 0.008],
    [[1, 0], null],
    ['', null],
    ['n/a', null],
    [Infinity, null],
    [undefined, null],
  ])('normalizes rational %j', (input, expected) => {
    expect(rational(input)).toBe(expected)
  })
  it('preserves capture clock, validates real calendar dates, and rejects invalid dates', () => {
    expect(normalizeDate('2024:02:29 23:15:01')).toBe('2024-02-29T23:15:01')
    expect(normalizeDate('2024-02-29T23:15:01+05:30')).toBe('2024-02-29T23:15:01')
    for (const date of [
      '2025:02:29 00:00:00',
      '0000:00:00 00:00:00',
      '2025:01:01 24:00:00',
      'bad',
      new Date(NaN),
    ])
      expect(normalizeDate(date)).toBeNull()
  })
  it('extracts all fields, signed compensation and flash bit masks', () => {
    const photo = normalizeExif(
      {
        Make: ' Canon\0 ',
        Model: 'R5',
        LensModel: 'RF 50mm',
        FocalLength: [50, 1],
        FocalLengthIn35mmFormat: 50,
        FNumber: [14, 10],
        ExposureTime: [1, 125],
        ISO: 100,
        DateTimeOriginal: '2025:05:03 12:00:00',
        latitude: 28.6,
        longitude: 77.2,
        ExposureCompensation: [-1, 3],
        Flash: 9,
      },
      { name: 'photo.cr3', size: 100 },
    )
    expect(photo).toMatchObject({
      cameraMake: 'Canon',
      cameraModel: 'R5',
      lensModel: 'RF 50mm',
      focalLength: 50,
      focalLength35mm: 50,
      aperture: 1.4,
      shutterSpeed: 0.008,
      iso: 100,
      dateTaken: '2025-05-03T12:00:00',
      latitude: 28.6,
      longitude: 77.2,
      exposureCompensation: -1 / 3,
      flashFired: true,
    })
    expect(isPhotoMeta(photo)).toBe(true)
  })
  it('skips empty EXIF but retains useful partial EXIF and false flash', () => {
    expect(normalizeExif(undefined, { name: 'x.jpg', size: 1 })).toBeNull()
    expect(normalizeExif({ ImageWidth: 1000 }, { name: 'x.jpg', size: 1 })).toBeNull()
    expect(
      normalizeExif({ Flash: 0, ISO: 0, FNumber: NaN, latitude: 999 }, { name: 'x.jpg', size: 1 }),
    ).toMatchObject({
      flashFired: false,
      iso: null,
      aperture: null,
      latitude: null,
      dateTaken: null,
    })
  })
  it('falls back to a valid CreateDate', () => {
    expect(
      normalizeExif(
        { DateTimeOriginal: 'bad', CreateDate: '2025:01:01 12:00:00' },
        { name: 'a', size: 1 },
      )?.dateTaken,
    ).toBe('2025-01-01T12:00:00')
  })
  it('dedupes by filename, size and date, including null dates, without mutating input', () => {
    const [a, b] = createSamplePhotos(2)
    const originals = [a!]
    const result = mergePhotos(originals, [a!, b!, b!])
    expect(result.photos).toHaveLength(2)
    expect(result.duplicates).toBe(2)
    expect(originals).toHaveLength(1)
    expect(photoId('a|1', 2, null)).not.toBe(photoId('a', 12, null))
    expect(photoId('a', 1, null)).not.toBe(photoId('a', 2, null))
    expect(photoId('a', 1, null)).not.toBe(photoId('a', 1, '2025-01-01T00:00:00'))
  })
  it('validates restored metadata and rejects corrupt records', () => {
    const photo = createSamplePhotos(1)[0]!
    expect(isPhotoMeta(photo)).toBe(true)
    for (const bad of [
      null,
      {},
      { ...photo, iso: Infinity },
      { ...photo, dateTaken: 'bad' },
      { ...photo, id: 'wrong' },
    ])
      expect(isPhotoMeta(bad)).toBe(false)
  })
  it('accepts all requested file formats case-insensitively', () => {
    for (const name of [
      'a.JPG',
      'b.jpeg',
      'a.HEIC',
      'a.tif',
      'a.tiff',
      'a.CR2',
      'a.CR3',
      'a.NEF',
      'a.ARW',
      'a.DNG',
    ])
      expect(isSupportedFile(name)).toBe(true)
    expect(isSupportedFile('file.exe')).toBe(false)
  })
  it('escapes CSV, preserves numeric fractions, and guards formula injection', () => {
    const p = {
      ...createSamplePhotos(1)[0]!,
      filename: '=SUM(1,2)',
      lensModel: 'A "quoted", lens',
      shutterSpeed: 1 / 125,
    }
    const csv = toCsv([p])
    expect(csv).toContain('"\'=SUM(1,2)"')
    expect(csv).toContain('"A ""quoted"", lens"')
    expect(csv).toContain('"0.008"')
    expect(CSV_FIELDS).toHaveLength(16)
    expect(toCsv([]).split('\r\n')).toHaveLength(1)
  })
})
