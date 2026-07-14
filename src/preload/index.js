import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data) => ipcRenderer.invoke('store:save', data),
  onMenu: (channel, callback) => {
    const validChannels = [
      'menu:new-note',
      'menu:new-folder',
      'menu:duplicate-note',
      'menu:focus-search',
      'menu:toggle-sidebar',
      'menu:settings',
      'menu:shortcuts'
    ]
    if (!validChannels.includes(channel)) return () => {}
    const listener = () => callback()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  checkForUpdates: () => ipcRenderer.invoke('update-check:run'),
  getAppVersion: () => ipcRenderer.invoke('update-check:app-version'),
  onUpdateCheckStatus: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('update-check:status', listener)
    return () => ipcRenderer.removeListener('update-check:status', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
