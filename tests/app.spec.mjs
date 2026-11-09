import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { makeExifFixture } from '../scripts/exif-fixture.mjs'

test('sample dashboard filters, exports, theme, keyboard and responsive layout', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Choose photos', exact: true }).first(),
  ).toBeEnabled()
  await expect(
    page.getByText('Your photos never leave your device.', { exact: true }).first(),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/landing-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Explore a sample library', exact: true }).click()
  await expect(page.locator('.stat-number')).toHaveText('1,248')
  await expect(page.getByRole('heading', { name: 'Focal length', exact: true })).toBeVisible()
  await page.screenshot({
    path: 'test-results/dashboard-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('combobox', { name: 'Camera', exact: true }).selectOption('Fujifilm X-T5')
  const filteredCount = Number((await page.locator('.stat-number').innerText()).replaceAll(',', ''))
  expect(filteredCount).toBeGreaterThan(0)
  expect(filteredCount).toBeLessThan(1248)
  await page.getByLabel('Minimum focal length').fill('85')
  await page.locator('.export-menu summary').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download JSON/ }).click()
  const download = await downloadPromise
  const rows = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.every((row) => row.cameraMake === 'Fujifilm' && row.focalLength >= 85)).toBe(true)
  await page.getByLabel('Minimum focal length').fill('1000')
  await expect(page.getByRole('heading', { name: 'No frames in this selection' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset all filters' }).click()
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.screenshot({
    path: 'test-results/dashboard-light.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Import photos', exact: true }).last().click()
  await expect(page.locator('.upload-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.upload-dialog')).not.toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/mobile-top.png', animations: 'disabled' })
  await page.screenshot({
    path: 'test-results/dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: /A clearer picture/ })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(errors).toEqual([])
})

test('worker parses EXIF, dedupes, skips errors, persists metadata only, exports and clears', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Choose photos', exact: true }).first(),
  ).toBeEnabled()
  const outbound = []
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('blob:'))
      outbound.push(request.url())
  })
  const fixture = { name: 'sample.jpg', mimeType: 'image/jpeg', buffer: makeExifFixture(0) }
  await page
    .getByLabel('Choose photo files', { exact: true })
    .first()
    .setInputFiles([
      fixture,
      fixture,
      { name: 'sample.cr3', mimeType: 'image/x-canon-cr3', buffer: makeExifFixture(2, 'cr3') },
      { name: 'sample.tiff', mimeType: 'image/tiff', buffer: makeExifFixture(1, 'tiff') },
      { name: 'empty.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: 'bad.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('broken') },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('unsupported') },
    ])
  await expect(page.getByText(/Import complete/)).toBeVisible()
  await expect(page.locator('.stat-number')).toHaveText('3')
  await expect(page.locator('.import-status')).toContainText('1 duplicates')
  await expect(page.locator('.import-status')).toContainText('2 skipped')
  await expect(page.locator('.import-status')).toContainText('1 unreadable')
  await page.locator('.export-menu summary').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download JSON/ }).click()
  const rows = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'))
  expect(rows.find((row) => row.filename === 'sample.jpg')).toMatchObject({
    cameraMake: 'PixelBase',
    lensModel: 'Sample 24-135mm',
    shutterSpeed: 0.008,
    aperture: 2.8,
    focalLength35mm: 24,
    latitude: 28.6,
    longitude: 77.2,
    flashFired: false,
    exposureCompensation: -1 / 3,
  })
  expect(rows.find((row) => row.filename === 'sample.jpg').dateTaken).toBe('2025-01-15T00:30:00')
  await expect(page.locator('footer')).toContainText('Metadata stays on this device')
  await page.reload()
  await expect(page.locator('.stat-number')).toHaveText('3')
  const stored = await page.evaluate(async () => {
    const { get } = await import('/node_modules/.vite/deps/idb-keyval.js')
    return await get('pixelbase:metadata:v1')
  })
  expect(stored).toEqual(rows)
  expect(Object.keys(stored[0])).toHaveLength(16)
  await page.getByRole('button', { name: 'Clear local library' }).click()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByRole('heading', { name: /A clearer picture/ })).toBeVisible()
  await expect(page.locator('footer')).toContainText('Metadata stays on this device')
  await page.reload()
  await expect(page.getByRole('heading', { name: /A clearer picture/ })).toBeVisible()
  expect(outbound).toEqual([])
})

test('handles 5001 files, reports progress and can cancel an import', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Choose photos', exact: true }).first(),
  ).toBeEnabled()
  const fixtures = Array.from({ length: 5001 }, (_, i) => ({
    name: `frame-${i}.jpg`,
    mimeType: 'image/jpeg',
    buffer: makeExifFixture(i),
  }))
  await page.getByLabel('Choose photo files', { exact: true }).first().setInputFiles(fixtures)
  await expect(page.getByRole('progressbar')).toBeVisible()
  await expect(page.getByText(/Import complete/)).toBeVisible({ timeout: 100000 })
  await expect(page.locator('.stat-number')).toHaveText('5,001')
  await expect(page.locator('.import-status')).toContainText('5,001 / 5,001 files')
  await page.getByRole('button', { name: 'Import photos', exact: true }).last().click()
  await page
    .locator('.upload-dialog')
    .getByLabel('Choose photo files', { exact: true })
    .setInputFiles(fixtures)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByText(/Import canceled/)).toBeVisible()
  await expect(page.locator('.stat-number')).toHaveText('5,001')
})

test('storage failure leaves parsing available and reports a recovery action', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage disabled')
      },
    }),
  )
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Choose photos', exact: true }).first(),
  ).toBeEnabled()
  await expect(page.getByRole('alert')).toContainText('Local storage is unavailable')
  await page
    .getByLabel('Choose photo files', { exact: true })
    .first()
    .setInputFiles({ name: 'sample.jpg', mimeType: 'image/jpeg', buffer: makeExifFixture() })
  await expect(page.locator('.stat-number')).toHaveText('1')
  await expect(page.getByRole('alert')).toContainText('Could not save metadata')
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
})

test('folder picker reads nested files and drag-and-drop adds another photo', async ({
  page,
}, testInfo) => {
  const { mkdir, writeFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const folder = testInfo.outputPath('import-folder')
  await mkdir(join(folder, 'nested'), { recursive: true })
  await writeFile(join(folder, 'one.jpg'), makeExifFixture(0))
  await writeFile(join(folder, 'nested', 'two.tiff'), makeExifFixture(1, 'tiff'))
  await writeFile(join(folder, 'notes.txt'), 'ignored')
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Choose photos', exact: true }).first(),
  ).toBeEnabled()
  await page.getByLabel('Choose photo folder', { exact: true }).first().setInputFiles(folder)
  await expect(page.getByText(/Import complete/)).toBeVisible()
  await expect(page.locator('.stat-number')).toHaveText('2')
  await expect(page.locator('.import-status')).toContainText('1 skipped')
  await page.getByRole('button', { name: 'Import photos', exact: true }).last().click()
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const data = new DataTransfer()
      data.items.add(
        new File([new Uint8Array(bytes)], 'dropped.cr3', { type: 'image/x-canon-cr3' }),
      )
      return data
    },
    [...makeExifFixture(2, 'cr3')],
  )
  await page
    .locator('.upload-dialog .upload-area')
    .dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.getByText(/Import complete/)).toBeVisible()
  await expect(page.locator('.stat-number')).toHaveText('3')
  await page.locator('.export-menu summary').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download CSV/ }).click()
  const csv = await readFile(await (await downloadPromise).path(), 'utf8')
  expect(csv).toContain('cameraMake,cameraModel,lensModel')
  expect(csv).toContain('dropped.cr3')
})
