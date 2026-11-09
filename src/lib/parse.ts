import exifr from 'exifr'

const OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  reviveValues: false,
  translateValues: false,
  pick: [
    'Make',
    'Model',
    'LensModel',
    'Lens',
    'FocalLength',
    'FocalLengthIn35mmFormat',
    'FNumber',
    'ExposureTime',
    'ISO',
    'PhotographicSensitivity',
    'DateTimeOriginal',
    'CreateDate',
    'GPSLatitude',
    'GPSLongitude',
    'GPSLatitudeRef',
    'GPSLongitudeRef',
    'ExposureCompensation',
    'ExposureBiasValue',
    'Flash',
  ],
}
const CANON_UUID = '85c0b687820f11e08111f4ce462b6a48'

/** CR3 stores independent TIFF directories in CMT boxes. Decode their tags with exifr.
 * Layout reference: https://exiftool.org/TagNames/Canon.html#uuid
 * Only metadata boxes are read: large image/video payloads are skipped by offset.
 */
async function parseCr3(file: Blob): Promise<Record<string, unknown>> {
  const tags: Record<string, unknown> = {}
  let boxes = 0
  async function visit(start: number, end: number, depth: number): Promise<void> {
    if (depth > 4) throw new Error('CR3 nesting limit exceeded')
    for (let offset = start; offset + 8 <= end;) {
      if (++boxes > 10000) throw new Error('CR3 box limit exceeded')
      const head = new Uint8Array(
        await file.slice(offset, Math.min(offset + 32, end)).arrayBuffer(),
      )
      const view = new DataView(head.buffer)
      let length = view.getUint32(0)
      const kind = String.fromCharCode(...head.slice(4, 8))
      let headerSize = 8
      if (length === 1) {
        if (head.length < 16) throw new Error('Truncated CR3 box')
        const wide = view.getBigUint64(8)
        if (wide > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CR3 box is too large')
        length = Number(wide)
        headerSize = 16
      } else if (length === 0) length = end - offset
      if (length < headerSize || length > end - offset) throw new Error('Invalid CR3 box length')
      const payload = offset + headerSize
      if (kind === 'moov') await visit(payload, offset + length, depth + 1)
      if (kind === 'uuid' && length >= headerSize + 16) {
        const uuid = new Uint8Array(await file.slice(payload, payload + 16).arrayBuffer())
        if (
          Array.from(uuid, (byte) => byte.toString(16).padStart(2, '0')).join('') === CANON_UUID
        ) {
          await visit(payload + 16, offset + length, depth + 1)
        }
      }
      if (['CMT1', 'CMT2', 'CMT4'].includes(kind)) {
        if (length - headerSize > 4 * 1024 * 1024)
          throw new Error('CR3 metadata block exceeds 4 MiB')
        let tiff = new Uint8Array(await file.slice(payload, offset + length).arrayBuffer())
        if (kind !== 'CMT1') tiff = wrapTiffDirectory(tiff, kind === 'CMT2' ? 0x8769 : 0x8825)
        const parsed: unknown = await exifr.parse(tiff, OPTIONS)
        if (typeof parsed === 'object' && parsed !== null) Object.assign(tags, parsed)
      }
      offset += length
    }
  }
  await visit(0, file.size, 0)
  return tags
}

/** Append a root IFD pointing at the original EXIF/GPS IFD without moving TIFF data offsets. */
function wrapTiffDirectory(tiff: Uint8Array, pointerTag: number): Uint8Array<ArrayBuffer> {
  if (tiff.length < 8) throw new Error('Truncated TIFF header')
  const littleEndian = tiff[0] === 0x49 && tiff[1] === 0x49
  if (!littleEndian && !(tiff[0] === 0x4d && tiff[1] === 0x4d))
    throw new Error('Invalid TIFF byte order')
  const original = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength)
  if (original.getUint16(2, littleEndian) !== 42) throw new Error('Invalid TIFF signature')
  const originalRoot = original.getUint32(4, littleEndian)
  if (originalRoot < 8 || originalRoot + 2 > tiff.length) throw new Error('Invalid TIFF directory')
  const appendedRoot = tiff.length + (tiff.length % 2)
  const wrapped = new Uint8Array(appendedRoot + 18)
  wrapped.set(tiff)
  const view = new DataView(wrapped.buffer)
  view.setUint32(4, appendedRoot, littleEndian)
  view.setUint16(appendedRoot, 1, littleEndian)
  view.setUint16(appendedRoot + 2, pointerTag, littleEndian)
  view.setUint16(appendedRoot + 4, 4, littleEndian)
  view.setUint32(appendedRoot + 6, 1, littleEndian)
  view.setUint32(appendedRoot + 10, originalRoot, littleEndian)
  return wrapped
}

export async function parseMetadata(file: Blob & { name: string }): Promise<unknown> {
  return file.name.toLowerCase().endsWith('.cr3') ? parseCr3(file) : exifr.parse(file, OPTIONS)
}
