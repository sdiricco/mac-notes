import { ipcMain, dialog } from 'electron'
import { writeFile, readFile } from 'fs/promises'

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
}
