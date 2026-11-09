# PixelBase

A private, browser-only photography analytics workspace. Drop in photos, read their EXIF in a background worker, and explore how you shoot.

**Your photos never leave your device.** No backend, accounts, tracking, external fonts, thumbnails, or image persistence.

## Run

Requires Node.js **22.12+** (Node 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```sh
npm run build       # Strict TypeScript check + production bundle
npm run preview     # Serve the production bundle locally
npm run lint        # Oxlint (including no-explicit-any) + TypeScript
npm test            # Vitest analytics, normalization, export, and binary parser tests
npm run test:watch
npx playwright install chromium
npm run test:e2e     # Browser flows, downloads, persistence, failures, mobile, 5,001-file import
```

The repository is ready to run; do not scaffold over it. For reference, its initial scaffold and dependency commands were:

```sh
npm create vite@latest pixelbase -- --template react-ts
cd pixelbase
npm install react@18 react-dom@18 exifr recharts zustand idb-keyval lucide-react
npm install -D @types/react@18 @types/react-dom@18 typescript vite @vitejs/plugin-react tailwindcss@3 postcss autoprefixer vitest @playwright/test oxlint
```

The committed package.json and package-lock.json pin a tested, React 18-compatible dependency set. Use `npm ci` for lockfile-exact installs.

## Features

- Photo drag and drop, multi-file selection, and recursive folder selection through the folder picker.
- JPEG, HEIC/HEIF, TIFF, CR2, CR3, NEF, ARW, and DNG input. Actual metadata availability depends on file structure and camera firmware.
- Live parse progress, cancellation, duplicate detection, and distinct skipped/unreadable counts.
- Summary cards for photo count, date range, most-used camera, and most-used lens.
- Focal length, aperture, ISO, shutter speed, hour, month, lens, and camera distributions.
- Three to five deterministic insights from the current selection; no AI service.
- Camera, lens, inclusive date, and focal length filters update every card, chart, insight, and export.
- CSV and JSON metadata downloads, including GPS when available.
- Dark-first appearance, persistent light toggle, responsive layout, keyboard controls, native modal focus handling, chart data tables, and reduced-motion support.
- IndexedDB metadata persistence, explicit storage errors, retry save, and a clear-library action.
- An isolated synthetic sample library that never changes your real library or persists itself.

## Architecture

```text
src/
  App.tsx                       Application shell, dialogs, theme
  components/
    Brand.tsx                   Shared branding
    ChartCard.tsx               Recharts chart + accessible data table
  features/
    upload/
      Landing.tsx               Empty state + sample entry
      UploadArea.tsx            Photo/folder inputs, drop zone, progress
      useImport.ts              Worker lifecycle, batches, cancellation
    dashboard/Dashboard.tsx     Summary, eight charts, insights
    filters/FilterBar.tsx        Global filters
    export/ExportMenu.tsx        Filtered CSV/JSON download
  workers/exif.worker.ts        Four concurrent readers inside 32-file batches
  lib/
    analytics.ts                Pure aggregation and filtering functions
    analytics.test.ts           Tests for every exported analytics function
    normalize.ts                Rationals, dates, missing fields, identity, dedupe
    normalize.test.ts           Normalization, persistence schema, CSV checks
    parse.ts                    exifr options + bounded CR3 container adapter
    parse.test.mjs              Binary JPEG/TIFF/CR3 parser fixtures
    persistence.ts              IndexedDB schema validation and ordered writes
    export.ts                   CSV escaping, formula protection, downloads
    fileTypes.ts                Accepted extensions
    sample.ts                   Deterministic synthetic PhotoMeta records
  store/useLibrary.ts           Zustand library, filters, import and save status
  types/photo.ts                Single PhotoMeta interface and worker protocol
scripts/
  exif-fixture.mjs               Binary EXIF fixture builder
  generate-samples.mjs           Sample folder generator
tests/app.spec.mjs               End-to-end browser tests
```

### Parsing and large imports

1. Inputs provide File handles. They are never sent over a network or stored in IndexedDB.
2. The main thread sends at most 32 File handles to the worker at a time. The worker reads at most four files concurrently using exifr's metadata parsing.
3. The worker normalizes records to the single `PhotoMeta` interface and sends progress and batch results. A bad file is isolated from the rest of the import.
4. Zustand merges completed batches. The identity is the JSON tuple `[filename, size, dateTaken]`; JSON encoding prevents separator collisions. Missing dates use null. Identical names/sizes/dates intentionally count once even across different folders.
5. The next batch is requested only when the preceding batch completes. There is no 5,000-file cutoff. Memory scales with File handles and metadata, not decoded full-size images.
6. At completion or cancellation, metadata writes are queued in order. Quota or IndexedDB failures leave the in-memory library usable and show an export/retry message.
7. Cancel terminates the worker immediately. Only completed batches are retained; the current incomplete batch is discarded. A worker error or 60 seconds without progress ends the run with a recoverable message.

**CR3 compatibility:** exifr 7 does not natively understand Canon's CR3 container. PixelBase walks its BMFF headers and Canon UUID metadata boxes, extracts CMT1/CMT2/CMT4 TIFF structures, and delegates tag decoding to exifr. EXIF and GPS root directories are wrapped without shifting their internal offsets. It skips image payloads and limits nesting, box count, and individual metadata blocks (4 MiB). The layout is based on [ExifTool's Canon UUID documentation](https://exiftool.org/TagNames/Canon.html#uuid). Maker-note-only lens names and unusual/new RAW variants may remain unavailable.

### Metadata semantics

- `PhotoMeta` includes filename, byte size, camera make/model, lens model, native focal length, 35mm equivalent, aperture, shutter seconds, ISO, capture date, latitude/longitude, exposure compensation in EV, and flash fired.
- Missing values are null, not zero or invented defaults. Files with no usable requested fields are skipped.
- Rational numbers such as `[1, 125]`, `{ numerator: 1, denominator: 125 }`, or `"1/125"` normalize to seconds (`0.008`).
- Capture dates use validated `YYYY-MM-DDTHH:mm:ss` **camera-local wall time**. No timezone conversion is applied. EXIF offsets are not retained in v1. Invalid dates are null; a valid CreateDate is used when DateTimeOriginal is missing/invalid.
- Flash fired is decoded from bit zero of the numeric EXIF flash mask.
- IndexedDB restores are schema-checked; corrupt records produce a visible storage error.
- Library data is browser/profile/origin-specific. Clearing browser data removes it. Private browsing or storage eviction can prevent durable saves. Export to keep a separate copy.

### Analytics semantics

- Histograms use lower-inclusive, upper-exclusive buckets. Native focal length drives filters/charts; the 35mm equivalent is available in exports.
- Highlighted focal bins contain common prime lengths (24, 28, 35, 50, 85, 135mm). This is a focal reference, not a claim that the lens is a prime.
- Aperture bins group fractional stops into full-stop ranges; a label f/2 means f/2 through less than f/2.8.
- ISO buckets double: 100 means 100–199, 200 means 200–399, and so on. The Y axis is photo count.
- Shutter buckets run from the displayed lower bound to the next bound. The last includes exposures of one second and longer.
- Hours follow the camera clock. Monthly counts use year-month keys and fill missing months (bounded to prevent pathological date spans).
- Missing values are excluded only from the relevant distribution. Unknown camera/lens groups are visible.
- Setting insights use the number of frames with that setting recorded as denominator. Lens share uses the entire filtered selection. Empty filters show a reset action instead of fabricated insights.
- CSV exports include a UTF-8 BOM, quote/escape text, and neutralize formula-leading strings. JSON preserves exact normalized values. Both export the active selection.

## Try it without photos

Click **Explore a sample library** on the landing screen for 1,248 deterministic metadata records.

To exercise the actual file/worker/parser path:

```sh
npm run sample          # 60 JPEG/TIFF EXIF containers + missing/corrupt EXIF cases
npm run sample -- 5001  # Stress fixture folder
```

Choose the generated `sample-photos` folder in the app. These tiny files are **metadata test containers, not viewable photographs**. They include camera, lens, rational exposure values, dates, and synthetic GPS. The two edge-case files demonstrate skip/error reporting. Use a fresh library to compare exact import totals; generation overwrites matching fixture names but does not remove older files from that folder.

The binary tests also construct CR3 metadata containers. Synthetic fixtures verify parsing logic, but are not a substitute for testing every camera's real RAW files.

## Validation

The browser suite covers sample isolation, global filtering, JSON download contents, dark/light modes, modal Escape handling, a 390px viewport without horizontal overflow, real worker JPEG/TIFF parsing, duplicates and bad files, metadata-only persistence, clear/reload, a 5,001-file import, cancellation, storage failure, and no off-origin requests during import.

No backend or deployment service is required. Serve `dist/` from a static host to distribute the app. The static host serves application code; photo handling remains entirely local.

## v2 roadmap

- Optional accounts and explicit opt-in cloud sync of metadata.
- Gear-comparison insights across shoots and camera/lens combinations.
- Shareable stats cards with controls to omit filenames and location.
- Saved collections and filter presets, metadata re-import, and richer RAW compatibility tests.

Image galleries, social features, AI features, and a mobile app are outside v1.
