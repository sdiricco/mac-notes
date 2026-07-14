import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { debounce } from '../utils/debounce'
import { stripHtml, extractTitleFromHtml } from '../utils/markdown'
import { api } from '../utils/api'
import { useSettingsStore } from './settings'

const ALL = 'all'
const TRASH = 'trash'

export const useNotesStore = defineStore('notes', {
  state: () => ({
    folders: [],
    notes: [],
    selectedFolderId: ALL,
    selectedNoteId: null,
    searchQuery: '',
    ready: false
  }),

  getters: {
    isTrashView: (state) => state.selectedFolderId === TRASH,
    isAllView: (state) => state.selectedFolderId === ALL,

    currentFolder: (state) => state.folders.find((f) => f.id === state.selectedFolderId) || null,

    folderCount: (state) => (folderId) =>
      state.notes.filter((n) => n.folderId === folderId && !n.trashed).length,

    trashCount: (state) => state.notes.filter((n) => n.trashed).length,
    allCount: (state) => state.notes.filter((n) => !n.trashed).length,

    visibleNotes: (state) => {
      const settings = useSettingsStore()
      const query = state.searchQuery.trim().toLowerCase()
      let list = state.notes.filter((n) => {
        if (state.selectedFolderId === TRASH) return n.trashed
        if (n.trashed) return false
        if (state.selectedFolderId === ALL) return true
        return n.folderId === state.selectedFolderId
      })
      if (query) {
        list = list.filter((n) => {
          const haystack = `${n.title} ${stripHtml(n.content)}`.toLowerCase()
          return haystack.includes(query)
        })
      }
      if (settings.pinnedOnly && state.selectedFolderId !== TRASH) {
        list = list.filter((n) => n.pinned)
      }
      const dir = settings.sortDir === 'asc' ? 1 : -1
      return list.slice().sort((a, b) => {
        // i preferiti restano sempre in cima
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        if (settings.sortKey === 'title') {
          const ta = a.title?.trim() || 'Nuova nota'
          const tb = b.title?.trim() || 'Nuova nota'
          return dir * ta.localeCompare(tb, 'it', { sensitivity: 'base' })
        }
        if (settings.sortKey === 'created') return dir * (a.createdAt - b.createdAt)
        return dir * (a.updatedAt - b.updatedAt)
      })
    },

    selectedNote: (state) => state.notes.find((n) => n.id === state.selectedNoteId) || null
  },

  actions: {
    async init() {
      const data = await api.loadData()
      this.folders = data.folders
      this.notes = data.notes
      this.selectedFolderId = ALL
      const firstNote = this.visibleNotes[0]
      this.selectedNoteId = firstNote ? firstNote.id : null
      this.ready = true
    },

    persist: debounce(function () {
      // i Proxy reattivi di Pinia non sono serializzabili via IPC: servono oggetti puri
      const plain = JSON.parse(JSON.stringify({ folders: this.folders, notes: this.notes }))
      api.saveData(plain)
    }, 350),

    selectFolder(folderId) {
      this.selectedFolderId = folderId
      this.searchQuery = ''
      const first = this.visibleNotes[0]
      this.selectedNoteId = first ? first.id : null
    },

    selectNote(noteId) {
      this.selectedNoteId = noteId
    },

    createNote(folderId) {
      const targetFolder =
        folderId ||
        (this.selectedFolderId !== ALL && this.selectedFolderId !== TRASH
          ? this.selectedFolderId
          : this.folders[0]?.id)
      const now = Date.now()
      const note = {
        id: uuid(),
        title: '',
        content: '',
        folderId: targetFolder,
        pinned: false,
        trashed: false,
        createdAt: now,
        updatedAt: now
      }
      this.notes.unshift(note)
      this.selectedFolderId = targetFolder
      this.selectedNoteId = note.id
      this.persist()
      return note
    },

    updateNote(id, patch) {
      const note = this.notes.find((n) => n.id === id)
      if (!note) return
      // Niente titolo digitato a mano: quando cambia il contenuto lo deduciamo
      // dal primo h1/h2/h3 (vuoto se non c'è). Sovrascrive un'eventuale
      // rinomina manuale precedente, per rispecchiare sempre il contenuto.
      const finalPatch = 'content' in patch ? { ...patch, title: extractTitleFromHtml(patch.content) } : patch
      Object.assign(note, finalPatch, { updatedAt: Date.now() })
      this.persist()
    },

    duplicateNote(id) {
      const note = this.notes.find((n) => n.id === id)
      if (!note) return
      const now = Date.now()
      const copy = {
        ...JSON.parse(JSON.stringify(note)),
        id: uuid(),
        title: `${note.title?.trim() || 'Nuova nota'} copia`,
        pinned: false,
        trashed: false,
        createdAt: now,
        updatedAt: now
      }
      const idx = this.notes.findIndex((n) => n.id === id)
      this.notes.splice(idx + 1, 0, copy)
      this.selectedNoteId = copy.id
      this.persist()
      return copy
    },

    togglePin(id) {
      const note = this.notes.find((n) => n.id === id)
      if (!note) return
      note.pinned = !note.pinned
      this.persist()
    },

    trashNote(id) {
      const note = this.notes.find((n) => n.id === id)
      if (!note) return
      note.trashed = true
      note.updatedAt = Date.now()
      if (this.selectedNoteId === id) {
        const next = this.visibleNotes.find((n) => n.id !== id)
        this.selectedNoteId = next ? next.id : null
      }
      this.persist()
    },

    restoreNote(id) {
      const note = this.notes.find((n) => n.id === id)
      if (!note) return
      note.trashed = false
      note.updatedAt = Date.now()
      this.persist()
    },

    deleteNotePermanently(id) {
      this.notes = this.notes.filter((n) => n.id !== id)
      if (this.selectedNoteId === id) {
        const next = this.visibleNotes[0]
        this.selectedNoteId = next ? next.id : null
      }
      this.persist()
    },

    emptyTrash() {
      this.notes = this.notes.filter((n) => !n.trashed)
      if (this.selectedNoteId && !this.notes.find((n) => n.id === this.selectedNoteId)) {
        this.selectedNoteId = null
      }
      this.persist()
    },

    createFolder(name) {
      const folder = { id: uuid(), name: name?.trim() || 'Nuova cartella', createdAt: Date.now() }
      this.folders.push(folder)
      this.persist()
      return folder
    },

    renameFolder(id, name) {
      const folder = this.folders.find((f) => f.id === id)
      if (!folder || !name?.trim()) return
      folder.name = name.trim()
      this.persist()
    },

    deleteFolder(id) {
      this.notes.forEach((n) => {
        if (n.folderId === id) {
          n.trashed = true
          n.updatedAt = Date.now()
        }
      })
      this.folders = this.folders.filter((f) => f.id !== id)
      if (this.selectedFolderId === id) {
        this.selectFolder(ALL)
      }
      this.persist()
    }
  }
})
