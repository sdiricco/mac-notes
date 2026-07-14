import { app, ipcMain } from 'electron'

const REPO = 'sdiricco/mac-notes'
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 ore

// Confronto semver semplice (major.minor.patch), sufficiente per i tag "vX.Y.Z"
// di questo progetto: non serve una libreria dedicata per soli tre numeri.
function parseVersion(v) {
  return (v || '').replace(/^v/, '').split('.').map(Number)
}
function isNewer(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

// Solo un controllo di versione via API pubblica di GitHub Releases: nessun
// download né installazione automatica (l'app non è firmata, l'auto-install
// di electron-updater fallirebbe su macOS senza un certificato Developer ID).
// L'utente aggiorna da sé con "brew upgrade --cask mac-notes".
export function initUpdateCheck(mainWindow) {
  const currentVersion = app.getVersion()

  const send = (status) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('update-check:status', status)
  }

  async function check() {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' }
      })
      if (!res.ok) return
      const data = await res.json()
      const latestVersion = (data.tag_name || '').replace(/^v/, '')
      if (latestVersion && isNewer(latestVersion, currentVersion)) {
        send({ available: true, currentVersion, latestVersion, url: data.html_url })
      } else {
        send({ available: false, currentVersion })
      }
    } catch {
      // Offline o rate limit dell'API: nessun problema, si riprova al prossimo giro.
    }
  }

  // I canali IPC restano attivi anche in dev/non-packaged (servono al pulsante
  // manuale "Controlla aggiornamenti" e alla versione mostrata in Impostazioni);
  // solo il controllo automatico periodico è limitato al build pacchettizzato.
  ipcMain.handle('update-check:run', check)
  ipcMain.handle('update-check:app-version', () => currentVersion)

  if (!app.isPackaged) return

  setTimeout(check, 4000)
  setInterval(check, CHECK_INTERVAL_MS)
}
