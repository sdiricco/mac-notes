<template>
  <section class="note-list">
    <div class="note-list-drag"></div>

    <div class="note-list-header" :class="{ inset: !sidebarVisible }">
      <h2>{{ folderTitle }}</h2>
      <div class="header-actions">
        <button class="icon-btn" title="Ordina e filtra" @click="sortMenu.toggle($event)">
          <Icon icon="lucide:arrow-up-down" />
        </button>
        <button
          v-if="!store.isTrashView"
          class="icon-btn"
          title="Nuova nota"
          @click="store.createNote()"
        >
          <Icon icon="lucide:square-pen" />
        </button>
        <button
          v-else
          class="icon-btn danger"
          title="Svuota cestino"
          :disabled="store.trashCount === 0"
          @click="confirmEmptyTrash"
        >
          <Icon icon="lucide:trash-2" />
        </button>
        <button
          v-if="!sidebarVisible"
          class="icon-btn"
          title="Mostra sidebar"
          @click="emit('toggle-sidebar')"
        >
          <Icon icon="lucide:panel-left-open" />
        </button>
      </div>
    </div>

    <div class="search-box">
      <Icon icon="lucide:search" />
      <input ref="searchInput" v-model="store.searchQuery" type="text" placeholder="Cerca" />
    </div>

    <div class="note-items">
      <div v-if="store.visibleNotes.length === 0" class="empty-state">
        <Icon icon="lucide:inbox" />
        <p>Nessuna nota</p>
      </div>

      <div
        v-for="note in store.visibleNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: note.id === store.selectedNoteId }"
        @click="store.selectNote(note.id)"
        @contextmenu.prevent="openMenu($event, note)"
      >
        <div class="note-item-top">
          <Icon v-if="note.pinned" icon="lucide:star" class="pin-icon" />
          <input
            v-if="renamingId === note.id"
            ref="renameInput"
            v-model="renameValue"
            class="rename-input"
            @click.stop
            @keyup.enter="commitRename(note)"
            @keyup.esc="renamingId = null"
            @blur="commitRename(note)"
          />
          <span v-else class="note-title">{{ note.title || 'Nuova nota' }}</span>
          <button class="kebab" title="Azioni" @click.stop="openMenu($event, note)">
            <Icon icon="lucide:ellipsis" />
          </button>
        </div>
        <div class="note-meta">
          <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
          <span class="note-preview">{{ preview(note.content) }}</span>
        </div>
      </div>
    </div>

    <!-- Menu azioni per nota -->
    <Menu ref="noteMenu" :model="noteMenuItems" :popup="true">
      <template #item="{ item, props }">
        <a class="menu-row" :class="{ danger: item.danger }" v-bind="props.action">
          <Icon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </a>
      </template>
    </Menu>

    <!-- Menu ordinamento / filtri -->
    <Menu ref="sortMenu" :model="sortMenuItems" :popup="true">
      <template #start>
        <div class="menu-title">Ordina per</div>
      </template>
      <template #item="{ item, props }">
        <a class="menu-row" v-bind="props.action">
          <Icon :icon="item.icon" />
          <span class="grow">{{ item.label }}</span>
          <Icon
            v-if="item.sortKey && settings.sortKey === item.sortKey"
            :icon="settings.sortDir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
            class="trail"
          />
          <Icon
            v-else-if="item.filter && settings.pinnedOnly"
            icon="lucide:check"
            class="trail"
          />
        </a>
      </template>
    </Menu>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import Menu from 'primevue/menu'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { Icon } from '@iconify/vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import { stripHtml, htmlToMarkdown } from '../utils/markdown'

defineProps({
  sidebarVisible: { type: Boolean, default: true }
})
const emit = defineEmits(['toggle-sidebar'])

const store = useNotesStore()
const settings = useSettingsStore()
const confirm = useConfirm()
const toast = useToast()

const searchInput = ref(null)
const noteMenu = ref(null)
const sortMenu = ref(null)
const menuTargetNote = ref(null)

const renamingId = ref(null)
const renameValue = ref('')
const renameInput = ref(null)

const folderTitle = computed(() => {
  if (store.isAllView) return 'Tutte le Note'
  if (store.isTrashView) return 'Cestino'
  return store.currentFolder?.name || 'Note'
})

const noteMenuItems = computed(() => {
  const note = menuTargetNote.value
  if (!note) return []
  if (note.trashed) {
    return [
      { label: 'Ripristina', icon: 'lucide:rotate-ccw', command: () => store.restoreNote(note.id) },
      {
        label: 'Elimina definitivamente',
        icon: 'lucide:trash-2',
        danger: true,
        command: () => store.deleteNotePermanently(note.id)
      }
    ]
  }
  return [
    { label: 'Rinomina', icon: 'lucide:pencil', command: () => startRename(note) },
    { label: 'Duplica', icon: 'lucide:copy-plus', command: () => store.duplicateNote(note.id) },
    { label: 'Copia testo', icon: 'lucide:clipboard', command: () => copyText(note) },
    { label: 'Copia come Markdown', icon: 'lucide:clipboard-list', command: () => copyMarkdown(note) },
    { separator: true },
    {
      label: note.pinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti',
      icon: 'lucide:star',
      command: () => store.togglePin(note.id)
    },
    {
      label: 'Sposta nel cestino',
      icon: 'lucide:trash-2',
      danger: true,
      command: () => store.trashNote(note.id)
    }
  ]
})

const sortMenuItems = computed(() => [
  { label: 'Data modifica', icon: 'lucide:clock', sortKey: 'updated', command: () => settings.setSort('updated') },
  { label: 'Data creazione', icon: 'lucide:calendar', sortKey: 'created', command: () => settings.setSort('created') },
  { label: 'Titolo', icon: 'lucide:case-sensitive', sortKey: 'title', command: () => settings.setSort('title') },
  { separator: true },
  { label: 'Solo preferiti', icon: 'lucide:star', filter: true, command: () => settings.togglePinnedOnly() }
])

function openMenu(event, note) {
  menuTargetNote.value = note
  noteMenu.value.toggle(event)
}

function startRename(note) {
  store.selectNote(note.id)
  renamingId.value = note.id
  renameValue.value = note.title || ''
  nextTick(() => renameInput.value?.[0]?.focus())
}

function commitRename(note) {
  if (renamingId.value !== note.id) return
  store.updateNote(note.id, { title: renameValue.value.trim() })
  renamingId.value = null
}

async function copyText(note) {
  await navigator.clipboard.writeText(stripHtml(note.content))
  toast.add({ severity: 'success', summary: 'Testo copiato', life: 1800 })
}

async function copyMarkdown(note) {
  await navigator.clipboard.writeText(htmlToMarkdown(note.content))
  toast.add({ severity: 'success', summary: 'Markdown copiato', life: 1800 })
}

function confirmEmptyTrash() {
  confirm.require({
    message: 'Eliminare definitivamente tutte le note nel cestino?',
    header: 'Svuota cestino',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Svuota',
    rejectLabel: 'Annulla',
    acceptClass: 'p-button-danger',
    accept: () => store.emptyTrash()
  })
}

function preview(content) {
  const text = stripHtml(content)
  return text.length ? text : 'Nessun testo aggiuntivo'
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

defineExpose({ focusSearch: () => searchInput.value?.focus() })
</script>

<style scoped>
.note-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--list-bg);
  border-right: 1px solid var(--p-content-border-color);
}

.note-list-drag {
  height: 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.note-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 8px;
  -webkit-app-region: drag;
}
/* quando la sidebar è chiusa i semafori della finestra coprono l'angolo: rientro */
.note-list-header.inset {
  padding-left: 74px;
}
.note-list-header h2 {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  font-size: 16px;
  display: flex;
  align-items: center;
}
.icon-btn:hover {
  background: var(--sidebar-hover-bg);
  color: var(--p-text-color);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.icon-btn.danger:hover {
  color: #e5484d;
}

.search-box {
  margin: 0 10px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--search-bg);
  border-radius: 8px;
  padding: 6px 9px;
}
.search-box :deep(svg) {
  color: var(--p-text-muted-color);
  font-size: 14px;
  flex-shrink: 0;
}
.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  width: 100%;
  color: var(--p-text-color);
}

.note-items {
  flex: 1;
  overflow-y: auto;
  padding: 2px 6px 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--p-text-muted-color);
  gap: 8px;
}
.empty-state :deep(svg) {
  font-size: 26px;
}

/* nota come card */
.note-item {
  padding: 8px 10px;
  border-radius: 9px;
  cursor: pointer;
  margin-bottom: 2px;
}
.note-item:hover {
  background: var(--sidebar-hover-bg);
}
.note-item.active {
  background: var(--card-bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
}

.note-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pin-icon {
  font-size: 11px;
  color: var(--icon-color);
  flex-shrink: 0;
}

.note-title {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kebab {
  border: none;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
  padding: 2px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  font-size: 15px;
  opacity: 0;
}
.note-item:hover .kebab,
.note-item.active .kebab {
  opacity: 1;
}
.kebab:hover {
  background: var(--selection-bg);
  color: var(--p-text-color);
}

.rename-input {
  flex: 1;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 4px;
  font-size: 13px;
  padding: 1px 5px;
  color: var(--p-text-color);
  outline: none;
}

.note-meta {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: var(--p-text-muted-color);
  margin-top: 2px;
}
.note-date {
  flex-shrink: 0;
}
.note-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* righe dei menu popup */
.menu-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
}
.menu-row .grow {
  flex: 1;
}
.menu-row :deep(svg),
.menu-row svg {
  font-size: 15px;
  color: var(--icon-color);
}
.menu-row .trail {
  font-size: 13px;
}
.menu-row.danger,
.menu-row.danger svg {
  color: #e5484d;
}
.menu-title {
  padding: 6px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--p-text-muted-color);
}
</style>
