// Bridge verso il main process Electron. Nel browser (preview/dev senza Electron)
// window.api non esiste: si usa un fallback su localStorage così l'app resta utilizzabile.

const STORAGE_KEY = 'mac-notes-data'

function browserDefaultData() {
  return {
    folders: [{ id: 'browser-folder-1', name: 'Note', createdAt: Date.now() }],
    notes: []
  }
}

const browserApi = {
  async loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* dati corrotti: si riparte dai default */
    }
    const data = browserDefaultData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data
  },

  async saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  },

  onMenu() {
    return () => {}
  },

  async checkForUpdates() {},
  async getAppVersion() {
    return 'dev'
  },
  onUpdateCheckStatus() {
    return () => {}
  },

  // Nel browser non c'è un dialogo nativo: si simula con un download via <a>
  // e una selezione file via <input type="file"> nascosto.
  async exportMarkdown(markdown, suggestedName) {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${suggestedName || 'nota'}.md`
    a.click()
    URL.revokeObjectURL(url)
    return { filePath: a.download }
  },

  async importMarkdown() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.md,.markdown,.txt'
      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        const reader = new FileReader()
        reader.onload = () => resolve({ markdown: String(reader.result), filePath: file.name })
        reader.readAsText(file)
      })
      input.addEventListener('cancel', () => resolve(null))
      input.click()
    })
  }
}

export const api = window.api ?? browserApi
