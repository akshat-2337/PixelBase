export const ACCEPTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'heic',
  'heif',
  'tif',
  'tiff',
  'cr2',
  'cr3',
  'nef',
  'arw',
  'dng',
]
export const ACCEPT_FILES = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(',')
export function isSupportedFile(name: string): boolean {
  return ACCEPTED_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? '')
}
