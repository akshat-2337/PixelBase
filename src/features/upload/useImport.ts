import { useEffect, useRef } from 'react'
import { useLibrary } from '../../store/useLibrary'
import type { WorkerRequest, WorkerResponse } from '../../types/photo'

export function useImport() {
  const workerRef = useRef<Worker | null>(null)
  const filesRef = useRef<File[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const release = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    filesRef.current = []
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }
  useEffect(
    () => () => {
      workerRef.current?.terminate()
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )
  const cancel = () => {
    release()
    useLibrary.getState().finishImport('Import canceled. Completed batches have been kept.')
  }
  const start = (files: File[]) => {
    const state = useLibrary.getState()
    if (!state.ready || state.importing || files.length === 0) return
    state.beginImport(files.length)
    filesRef.current = files
    let offset = 0
    let skipped = 0
    let errors = 0
    const fail = () => {
      release()
      useLibrary
        .getState()
        .finishImport(
          'Parsing stopped unexpectedly. Completed batches are safe; try the remaining files again.',
        )
    }
    const armTimeout = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(fail, 60000)
    }
    const send = () => {
      armTimeout()
      const request: WorkerRequest = {
        type: 'batch',
        files: filesRef.current.slice(offset, offset + 32),
      }
      workerRef.current?.postMessage(request)
    }
    try {
      workerRef.current = new Worker(new URL('../../workers/exif.worker.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current.onerror = fail
      workerRef.current.onmessageerror = fail
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        armTimeout()
        const message = event.data
        const current = useLibrary.getState()
        if (message.type === 'progress') {
          current.updateProgress({
            processed: offset + message.processed,
            skipped: skipped + message.skipped,
            errors: errors + message.errors,
          })
        } else {
          current.appendBatch(message.photos)
          skipped += message.skipped
          errors += message.errors
          offset = Math.min(offset + 32, filesRef.current.length)
          if (offset < filesRef.current.length) send()
          else {
            release()
            useLibrary.getState().finishImport()
          }
        }
      }
      send()
    } catch {
      fail()
    }
  }
  return { start, cancel }
}
