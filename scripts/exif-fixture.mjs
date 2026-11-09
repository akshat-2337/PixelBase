/** Tiny EXIF containers for parser testing; these are not viewable photographs. */
export function makeExifFixture(index = 0, format = 'jpeg') {
  const buffer = Buffer.alloc(2048)
  buffer.write('II', 0)
  buffer.writeUInt16LE(42, 2)
  buffer.writeUInt32LE(8, 4)
  const ascii = (tag, text) => ({
    tag,
    type: 2,
    count: text.length + 1,
    bytes: Buffer.from(text + '\0'),
  })
  const short = (tag, number) => {
    const bytes = Buffer.alloc(2)
    bytes.writeUInt16LE(number)
    return { tag, type: 3, count: 1, bytes }
  }
  const long = (tag, number) => {
    const bytes = Buffer.alloc(4)
    bytes.writeUInt32LE(number)
    return { tag, type: 4, count: 1, bytes }
  }
  const rational = (tag, pairs, signed = false) => {
    const bytes = Buffer.alloc(pairs.length * 8)
    pairs.forEach(([n, d], i) => {
      if (signed) {
        bytes.writeInt32LE(n, i * 8)
        bytes.writeInt32LE(d, i * 8 + 4)
      } else {
        bytes.writeUInt32LE(n, i * 8)
        bytes.writeUInt32LE(d, i * 8 + 4)
      }
    })
    return { tag, type: signed ? 10 : 5, count: pairs.length, bytes }
  }
  const focal = [24, 35, 50, 85, 135][index % 5]
  const date = `2025:${String((index % 12) + 1).padStart(2, '0')}:15 ${String(index % 24).padStart(2, '0')}:30:00`
  const exif = [
    rational(0x829a, [[1, 125]]),
    rational(0x829d, [[28, 10]]),
    short(0x8827, [100, 200, 800, 3200, 6400][index % 5]),
    ascii(0x9003, date),
    rational(0x9204, [[-1, 3]], true),
    short(0x9209, index % 2),
    rational(0x920a, [[focal, 1]]),
    short(0xa405, focal),
    ascii(0xa434, 'Sample 24-135mm'),
  ]
  const exifOffset = 8 + 2 + 4 * 12 + 4
  const gpsOffset = exifOffset + 2 + exif.length * 12 + 4
  const gps = [
    ascii(1, 'N'),
    rational(2, [
      [28, 1],
      [36, 1],
      [0, 1],
    ]),
    ascii(3, 'E'),
    rational(4, [
      [77, 1],
      [12, 1],
      [0, 1],
    ]),
  ]
  const ifd0 = [
    ascii(0x10f, 'PixelBase'),
    ascii(0x110, index % 2 ? 'Sample B' : 'Sample A'),
    long(0x8769, exifOffset),
    long(0x8825, gpsOffset),
  ]
  let heap = gpsOffset + 2 + gps.length * 12 + 4
  function directory(offset, entries) {
    entries.sort((a, b) => a.tag - b.tag)
    buffer.writeUInt16LE(entries.length, offset)
    entries.forEach((entry, i) => {
      const position = offset + 2 + i * 12
      buffer.writeUInt16LE(entry.tag, position)
      buffer.writeUInt16LE(entry.type, position + 2)
      buffer.writeUInt32LE(entry.count, position + 4)
      if (entry.bytes.length <= 4) entry.bytes.copy(buffer, position + 8)
      else {
        buffer.writeUInt32LE(heap, position + 8)
        entry.bytes.copy(buffer, heap)
        heap += entry.bytes.length
        if (heap % 2) heap++
      }
    })
  }
  directory(8, ifd0)
  directory(exifOffset, exif)
  directory(gpsOffset, gps)
  const tiff = buffer.subarray(0, heap)
  if (format === 'cr3') {
    const box = (kind, payload) => {
      const header = Buffer.alloc(8)
      header.writeUInt32BE(payload.length + 8)
      header.write(kind, 4)
      return Buffer.concat([header, payload])
    }
    const root = Buffer.from(tiff)
    root.writeUInt16LE(2, 8)
    root.writeUInt32LE(0, 34)
    const exifRoot = Buffer.from(tiff)
    exifRoot.writeUInt32LE(exifOffset, 4)
    const gpsRoot = Buffer.from(tiff)
    gpsRoot.writeUInt32LE(gpsOffset, 4)
    return Buffer.concat([
      box('ftyp', Buffer.from('crx \0\0\0\0crx ')),
      box(
        'moov',
        box(
          'uuid',
          Buffer.concat([
            Buffer.from('85c0b687820f11e08111f4ce462b6a48', 'hex'),
            box('CMT1', root),
            box('CMT2', exifRoot),
            box('CMT4', gpsRoot),
          ]),
        ),
      ),
    ])
  }

  if (format === 'tiff') return tiff
  const exifPayload = Buffer.concat([Buffer.from('Exif\0\0'), tiff])
  const marker = Buffer.from([0xff, 0xe1, 0, 0])
  marker.writeUInt16BE(exifPayload.length + 2, 2)
  return Buffer.concat([Buffer.from([0xff, 0xd8]), marker, exifPayload, Buffer.from([0xff, 0xd9])])
}
