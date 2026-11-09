import { useId, useRef, useState } from 'react'
import { ArrowUpRight, FolderOpen, LockKeyhole, Upload, X } from 'lucide-react'
import { ACCEPT_FILES } from '../../lib/fileTypes'
import { useLibrary } from '../../store/useLibrary'

export function UploadArea({
  onFiles,
  compact = false,
}: {
  onFiles: (files: File[]) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const depth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const id = useId()
  const disabled = useLibrary((state) => state.importing || !state.ready)
  const pick = (files: FileList | null) => {
    if (files && !disabled) onFiles(Array.from(files))
  }
  return (
    <div
      className={`upload-area ${compact ? 'compact' : ''} ${dragging ? 'dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        depth.current++
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        if (--depth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        depth.current = 0
        setDragging(false)
        pick(event.dataTransfer.files)
      }}
    >
      <div className="upload-icon">
        <Upload size={25} strokeWidth={1.4} />
      </div>
      <h3>Drop your photos here</h3>
      <p>From your first fifty to your next five thousand.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          className="button primary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Choose photos <ArrowUpRight size={16} />
        </button>
        <button
          className="button secondary"
          onClick={() => folderRef.current?.click()}
          disabled={disabled}
        >
          <FolderOpen size={16} /> Choose folder
        </button>
      </div>
      <input
        id={id}
        ref={inputRef}
        aria-label="Choose photo files"
        type="file"
        disabled={disabled}
        accept={ACCEPT_FILES}
        multiple
        hidden
        onChange={(event) => {
          pick(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={folderRef}
        aria-label="Choose photo folder"
        type="file"
        disabled={disabled}
        {...{ webkitdirectory: '', directory: '' }}
        multiple
        hidden
        onChange={(event) => {
          pick(event.target.files)
          event.target.value = ''
        }}
      />
      <div className="format-label">
        JPEG <span>·</span> HEIC <span>·</span> TIFF <span>·</span> RAW
      </div>
      <p className="upload-footnote">
        CR2, CR3, NEF, ARW & DNG · Metadata support varies by camera
      </p>
      <div className="privacy-line">
        <LockKeyhole size={13} />
        <span>Your photos never leave your device.</span>
      </div>
    </div>
  )
}

export function ImportStatus({ onCancel }: { onCancel: () => void }) {
  const progress = useLibrary((state) => state.progress)
  const importing = useLibrary((state) => state.importing)
  const message = useLibrary((state) => state.message)
  if (!progress) return null
  return (
    <div className="import-status" role="status" aria-live="polite">
      <div className="flex justify-between items-center gap-4">
        <div>
          <strong>{importing ? 'Reading the details…' : message}</strong>
          <p>
            {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} files
            <span className="mx-2">·</span>
            {progress.added.toLocaleString()} added
            <span className="mx-2">·</span>
            {progress.duplicates.toLocaleString()} duplicates
            <span className="mx-2">·</span>
            {progress.skipped.toLocaleString()} skipped
            <span className="mx-2">·</span>
            {progress.errors.toLocaleString()} unreadable
          </p>
        </div>
        {importing && (
          <button className="button subtle" onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
        )}
      </div>
      {importing && (
        <progress
          aria-label="EXIF parsing progress"
          value={progress.processed}
          max={progress.total}
        />
      )}
      {!importing && progress.skipped + progress.errors > 0 && (
        <p className="mt-2">
          Skipped files have no usable EXIF or an unsupported extension. Unreadable files may be
          damaged or use an unsupported RAW variant.
        </p>
      )}
    </div>
  )
}
