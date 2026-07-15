import { ipcMain, dialog } from 'electron'
import { writeFile, readFile, stat } from 'fs/promises'
import { extname } from 'path'

const IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp'
}

// Oltre questa soglia la conversione in base64 (sincrona, sul thread del main
// process) può bloccare l'intera app abbastanza a lungo da sembrare
// bloccata/da forzare la chiusura: meglio rifiutare con un errore chiaro che
// tentare la conversione e rischiare di congelare l'interfaccia.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

// Il renderer in sviluppo è servito da http://localhost:5173 (non file://):
// Chromium blocca il caricamento di risorse file:// da un'origine http, quindi
// un <img src="file://..."> non si vede (né in dev né, per coerenza, in
// produzione). Si legge il file e lo si incorpora come data URI: funziona
// sempre, indipendentemente da dove/come è servito il renderer.
async function readImageAsDataUri(filePath) {
  const { size } = await stat(filePath)
  if (size > MAX_IMAGE_BYTES) {
    const err = new Error('image-too-large')
    err.code = 'IMAGE_TOO_LARGE'
    throw err
  }
  const buffer = await readFile(filePath)
  const ext = extname(filePath).slice(1).toLowerCase()
  const mime = IMAGE_MIME_TYPES[ext] || 'application/octet-stream'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

// Import/export sono operazioni one-shot su file, non una vista "live" sincronizzata
// col contenuto Quill (per quello vedi la sola conversione in utils/markdown.js):
// qui il main process si limita a mostrare i dialoghi nativi e leggere/scrivere il file.
export function initFileTransfer(mainWindow) {
  ipcMain.handle('note:export-md', async (_event, { markdown, suggestedName }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Esporta come Markdown',
      defaultPath: `${suggestedName || 'nota'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, markdown, 'utf-8')
    return { filePath }
  })

  ipcMain.handle('note:import-md', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Importa Markdown',
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
    })
    if (canceled || filePaths.length === 0) return null
    const markdown = await readFile(filePaths[0], 'utf-8')
    return { markdown, filePath: filePaths[0] }
  })

  ipcMain.handle('note:pick-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Scegli un\'immagine',
      properties: ['openFile'],
      filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }]
    })
    if (canceled || filePaths.length === 0) return null
    try {
      return { dataUri: await readImageAsDataUri(filePaths[0]) }
    } catch (err) {
      return { error: err.code === 'IMAGE_TOO_LARGE' ? 'too-large' : 'read-failed' }
    }
  })

  // Per un percorso locale digitato a mano (non scelto dal dialogo sopra):
  // stessa conversione a data URI, altrimenti non si vedrebbe (vedi
  // readImageAsDataUri).
  ipcMain.handle('note:read-local-image', async (_event, filePath) => {
    try {
      return { dataUri: await readImageAsDataUri(filePath) }
    } catch (err) {
      return { error: err.code === 'IMAGE_TOO_LARGE' ? 'too-large' : 'read-failed' }
    }
  })
}
