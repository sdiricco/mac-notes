import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, renameSync } from 'fs'
import { randomUUID } from 'crypto'

// Una nota per file (invece di un unico blob con tutto l'archivio): ogni
// salvataggio riscrive solo il file della nota modificata, non l'intero
// archivio a ogni battitura. JSON testuale (non binario): a queste dimensioni
// (poche decine di KB per nota) il collo di bottiglia è il numero di
// operazioni su file, non il formato di serializzazione, e il testo resta
// leggibile/debuggabile/apribile a mano in caso di problemi.
const rootDir = () => app.getPath('userData')
const notesDir = () => join(rootDir(), 'notes')
const foldersFile = () => join(rootDir(), 'folders.json')
const legacyDataFile = () => join(rootDir(), 'notes-data.json')

// Cartella esposta a "Mostra nel Finder": prima era un unico file, ora è
// l'intero archivio (una directory), quindi va aperta con shell.openPath
// invece di shell.showItemInFolder.
export const DATA_DIR = notesDir

function ensureDirs() {
  if (!existsSync(rootDir())) mkdirSync(rootDir(), { recursive: true })
  if (!existsSync(notesDir())) mkdirSync(notesDir(), { recursive: true })
}

function defaultFolders() {
  return [{ id: randomUUID(), name: 'Note', createdAt: Date.now() }]
}

// Migrazione una tantum dal vecchio formato (un unico notes-data.json): se
// esiste ancora e la nuova struttura non è mai stata creata, la si esplode in
// folders.json + un file per nota, poi si rinomina il vecchio file (non lo si
// cancella, per sicurezza) così la migrazione non riparte ai prossimi avvii.
function migrateLegacyDataIfNeeded() {
  if (!existsSync(legacyDataFile())) return
  try {
    const raw = JSON.parse(readFileSync(legacyDataFile(), 'utf-8'))
    writeFileSync(foldersFile(), JSON.stringify(raw.folders || defaultFolders(), null, 2), 'utf-8')
    for (const note of raw.notes || []) {
      writeFileSync(join(notesDir(), `${note.id}.json`), JSON.stringify(note, null, 2), 'utf-8')
    }
    renameSync(legacyDataFile(), `${legacyDataFile()}.migrated`)
  } catch {
    // dati legacy corrotti: si ignora e si riparte dai default, il file
    // originale resta lì (non viene toccato) per un'eventuale ispezione manuale
  }
}

export function loadData() {
  ensureDirs()
  migrateLegacyDataIfNeeded()

  let folders
  if (existsSync(foldersFile())) {
    try {
      folders = JSON.parse(readFileSync(foldersFile(), 'utf-8'))
    } catch {
      folders = defaultFolders()
    }
  } else {
    folders = defaultFolders()
    writeFileSync(foldersFile(), JSON.stringify(folders, null, 2), 'utf-8')
  }

  const notes = readdirSync(notesDir())
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(notesDir(), name), 'utf-8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)

  return { folders, notes }
}

export function saveNote(note) {
  ensureDirs()
  writeFileSync(join(notesDir(), `${note.id}.json`), JSON.stringify(note, null, 2), 'utf-8')
}

export function deleteNoteFile(id) {
  const file = join(notesDir(), `${id}.json`)
  if (existsSync(file)) unlinkSync(file)
}

export function saveFolders(folders) {
  ensureDirs()
  writeFileSync(foldersFile(), JSON.stringify(folders, null, 2), 'utf-8')
}
