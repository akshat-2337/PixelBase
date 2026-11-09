import { afterAll, vi } from 'vitest'

// Node exposes Blob/File but not FileReader. Use its arrayBuffer API for exifr's browser reader.
vi.stubGlobal(
  'FileReader',
  class {
    result = null
    onloadend = null
    onerror = null
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((result) => {
          this.result = result
          this.onloadend?.()
        })
        .catch((error) => this.onerror?.(error))
    }
  },
)
afterAll(() => vi.unstubAllGlobals())

import { expect, it } from 'vitest'
import { makeExifFixture } from '../../scripts/exif-fixture.mjs'
import { parseMetadata } from './parse'
import { normalizeExif } from './normalize'

it.each(['jpeg', 'tiff', 'cr3'])('decodes real binary %s metadata with exifr', async (format) => {
  const bytes = makeExifFixture(0, format)
  const file = new File([bytes], 'sample.' + (format === 'jpeg' ? 'jpg' : format))
  const tags = await parseMetadata(file)
  expect(normalizeExif(tags, file)).toMatchObject({
    cameraMake: 'PixelBase',
    cameraModel: 'Sample A',
    lensModel: 'Sample 24-135mm',
    focalLength: 24,
    focalLength35mm: 24,
    aperture: 2.8,
    shutterSpeed: 0.008,
    iso: 100,
    dateTaken: '2025-01-15T00:30:00',
    latitude: 28.6,
    longitude: 77.2,
    flashFired: false,
    exposureCompensation: -1 / 3,
  })
})
it('rejects malformed CR3 lengths instead of looping or reading a huge payload', async () => {
  const bytes = Buffer.alloc(8)
  bytes.writeUInt32BE(4)
  bytes.write('moov', 4)
  await expect(parseMetadata(new File([bytes], 'bad.cr3'))).rejects.toThrow(
    'Invalid CR3 box length',
  )
})
it('accepts extended and zero-size BMFF boxes without parsing image payloads', async () => {
  const extended = Buffer.alloc(16)
  extended.writeUInt32BE(1)
  extended.write('mdat', 4)
  extended.writeBigUInt64BE(16n, 8)
  const zero = Buffer.alloc(8)
  zero.write('mdat', 4)
  await expect(parseMetadata(new File([extended, zero], 'empty.cr3'))).resolves.toEqual({})
})
