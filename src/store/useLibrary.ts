import { create } from 'zustand'
import { EMPTY_FILTERS, type Filters, type ImportProgress, type PhotoMeta } from '../types/photo'
import { loadPhotos, savePhotos } from '../lib/persistence'
import { mergePhotos } from '../lib/normalize'

interface LibraryState {
  photos: PhotoMeta[]
  filters: Filters
  ready: boolean
  demo: boolean
  importing: boolean
  progress: ImportProgress | null
  message: string | null
  storageError: string | null
  saving: boolean
  hydrate: () => Promise<void>
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  setDemo: (demo: boolean) => void
  beginImport: (total: number) => void
  updateProgress: (patch: Partial<ImportProgress>) => void
  appendBatch: (photos: PhotoMeta[]) => void
  finishImport: (message?: string) => void
  persist: () => Promise<void>
  clear: () => Promise<void>
}
let hydration: Promise<void> | null = null
let saveVersion = 0
export const useLibrary = create<LibraryState>((set, get) => ({
  photos: [],
  filters: { ...EMPTY_FILTERS },
  ready: false,
  demo: false,
  importing: false,
  progress: null,
  message: null,
  storageError: null,
  saving: false,
  hydrate: () => {
    hydration ??= loadPhotos()
      .then((photos) => set({ photos, ready: true }))
      .catch(() =>
        set({
          ready: true,
          storageError:
            'Local storage is unavailable or unreadable. You can still analyze and export this session.',
        }),
      )
    return hydration
  },
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),
  setDemo: (demo) => set({ demo, filters: { ...EMPTY_FILTERS }, message: null, progress: null }),
  beginImport: (total) =>
    set({
      demo: false,
      importing: true,
      message: null,
      filters: { ...EMPTY_FILTERS },
      progress: { processed: 0, total, added: 0, duplicates: 0, skipped: 0, errors: 0 },
    }),
  updateProgress: (patch) =>
    set((state) => ({ progress: state.progress ? { ...state.progress, ...patch } : null })),
  appendBatch: (incoming) =>
    set((state) => {
      const merged = mergePhotos(state.photos, incoming)
      return {
        photos: merged.photos,
        progress: state.progress
          ? {
              ...state.progress,
              added: state.progress.added + incoming.length - merged.duplicates,
              duplicates: state.progress.duplicates + merged.duplicates,
            }
          : null,
      }
    }),
  finishImport: (message) => {
    set({
      importing: false,
      message: message ?? 'Import complete. Your library is ready to explore.',
    })
    void get().persist()
  },
  persist: async () => {
    const version = ++saveVersion
    set({ saving: true })
    try {
      await savePhotos(get().photos)
      if (version === saveVersion) set({ saving: false, storageError: null })
    } catch {
      if (version === saveVersion)
        set({
          saving: false,
          storageError:
            'Could not save metadata on this device. Keep this tab open or export your library.',
        })
    }
  },
  clear: async () => {
    set({ photos: [], demo: false, filters: { ...EMPTY_FILTERS }, progress: null, message: null })
    await get().persist()
  },
}))
