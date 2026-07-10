import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

const DATA_FILE = () => join(app.getPath('userData'), 'notes-data.json')

function defaultData() {
  return {
    folders: [{ id: randomUUID(), name: 'Note', createdAt: Date.now() }],
    notes: []
  }
}

export function loadData() {
  const file = DATA_FILE()
  if (!existsSync(file)) {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const data = defaultData()
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
    return data
  }
  try {
    const raw = readFileSync(file, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return defaultData()
  }
}

export function saveData(data) {
  const file = DATA_FILE()
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}
