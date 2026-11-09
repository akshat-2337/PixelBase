import type { PhotoMeta } from '../types/photo'

export const CSV_FIELDS: (keyof PhotoMeta)[] = [
  'id',
  'filename',
  'size',
  'cameraMake',
  'cameraModel',
  'lensModel',
  'focalLength',
  'focalLength35mm',
  'aperture',
  'shutterSpeed',
  'iso',
  'dateTaken',
  'latitude',
  'longitude',
  'exposureCompensation',
  'flashFired',
]
function csvCell(value: PhotoMeta[keyof PhotoMeta]): string {
  if (value === null) return ''
  let text = String(value)
  // Prevent spreadsheet formula execution in camera strings and filenames.
  if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
export function toCsv(photos: PhotoMeta[]): string {
  return (
    '\uFEFF' +
    [
      CSV_FIELDS.join(','),
      ...photos.map((photo) => CSV_FIELDS.map((key) => csvCell(photo[key])).join(',')),
    ].join('\r\n')
  )
}
export function downloadMetadata(photos: PhotoMeta[], format: 'csv' | 'json'): void {
  const content = format === 'csv' ? toCsv(photos) : JSON.stringify(photos, null, 2)
  const blob = new Blob([content], {
    type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pixelbase-${new Date().toISOString().slice(0, 10)}.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
