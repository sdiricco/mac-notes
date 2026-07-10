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
  }
}

export const api = window.api ?? browserApi
