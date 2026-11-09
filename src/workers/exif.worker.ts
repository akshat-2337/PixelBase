import { parseMetadata } from '../lib/parse'
import { normalizeExif } from '../lib/normalize'
import { isSupportedFile } from '../lib/fileTypes'
import type { PhotoMeta, WorkerRequest, WorkerResponse } from '../types/photo'

const worker = self as unknown as DedicatedWorkerGlobalScope
const post = (message: WorkerResponse) => worker.postMessage(message)
worker.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { files } = event.data
  const photos: PhotoMeta[] = []
  let skipped = 0
  let errors = 0
  let processed = 0
  // Four concurrent readers, at most 32 File references in each main-thread batch.
  for (let offset = 0; offset < files.length; offset += 4) {
    await Promise.all(
      files.slice(offset, offset + 4).map(async (file) => {
        try {
          if (!isSupportedFile(file.name)) {
            skipped++
            return
          }
          const raw: unknown = await parseMetadata(file)
          const photo = normalizeExif(raw, file)
          if (photo) photos.push(photo)
          else skipped++
        } catch {
          errors++
        } finally {
          processed++
          post({ type: 'progress', processed, skipped, errors })
        }
      }),
    )
  }
  post({ type: 'batch-complete', photos, skipped, errors })
}
