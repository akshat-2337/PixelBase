import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { makeExifFixture } from './exif-fixture.mjs'

const count = Number(process.argv[2] ?? 60)
if (!Number.isInteger(count) || count < 1 || count > 20000)
  throw new Error('Choose a sample count from 1 to 20000.')
const destination = join(process.cwd(), 'sample-photos')
await mkdir(destination, { recursive: true })
for (let start = 0; start < count; start += 100) {
  await Promise.all(
    Array.from({ length: Math.min(100, count - start) }, (_, offset) => {
      const index = start + offset
      const extension = index % 2 ? 'tiff' : 'jpg'
      return writeFile(
        join(destination, `sample-${String(index + 1).padStart(5, '0')}.${extension}`),
        makeExifFixture(index, extension === 'tiff' ? 'tiff' : 'jpeg'),
      )
    }),
  )
}
await writeFile(join(destination, 'no-exif.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
await writeFile(join(destination, 'unreadable.jpg'), 'intentionally not an image')
console.log(
  `Created ${count} EXIF fixtures plus two edge-case files in ${destination}. Import this folder in PixelBase. These metadata containers are parser fixtures, not viewable photographs.`,
)
