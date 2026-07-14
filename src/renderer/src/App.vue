<template>
  <div v-if="!store.ready" class="loading">
    <Icon icon="lucide:loader-circle" class="spin" />
  </div>
  <template v-else>
    <Splitter class="app-shell" :gutter-size="1">
      <SplitterPanel
        v-show="ui.sidebarVisible"
        :size="15"
        :min-size="11"
        :max-size="22"
        class="panel sidebar-panel"
      >
        <Sidebar @toggle-sidebar="ui.toggleSidebar()" />
      </SplitterPanel>
      <SplitterPanel :size="21" :min-size="15" :max-size="32" class="panel">
        <NoteList ref="noteListRef" :sidebar-visible="ui.sidebarVisible" @toggle-sidebar="ui.toggleSidebar()" />
      </SplitterPanel>
      <SplitterPanel :size="64" class="panel">
        <NoteEditor />
      </SplitterPanel>
    </Splitter>

    <SettingsDialog />
    <ShortcutsDialog />
  </template>

  <ConfirmDialog />
  <Toast position="bottom-right" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { Icon } from '@iconify/vue'
import Sidebar from './components/Sidebar.vue'
import NoteList from './components/NoteList.vue'
import NoteEditor from './components/NoteEditor.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import ShortcutsDialog from './components/ShortcutsDialog.vue'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'
import { useUiStore } from './stores/ui'
import { useUpdateCheckStore } from './stores/updateCheck'
import { api } from './utils/api'

const store = useNotesStore()
const settings = useSettingsStore()
const ui = useUiStore()
const updateCheck = useUpdateCheckStore()
const noteListRef = ref(null)
const unsubscribers = []

onMounted(async () => {
  settings.init()
  updateCheck.init()
  await store.init()

  unsubscribers.push(
    api.onMenu('menu:new-note', () => store.createNote()),
    api.onMenu('menu:new-folder', () => {
      const folder = store.createFolder('Nuova cartella')
      store.selectFolder(folder.id)
    }),
    api.onMenu('menu:duplicate-note', () => {
      if (store.selectedNoteId) store.duplicateNote(store.selectedNoteId)
    }),
    api.onMenu('menu:focus-search', () => noteListRef.value?.focusSearch()),
    api.onMenu('menu:toggle-sidebar', () => ui.toggleSidebar()),
    api.onMenu('menu:settings', () => ui.openSettings()),
    api.onMenu('menu:shortcuts', () => ui.openShortcuts())
  )
})

onBeforeUnmount(() => {
  unsubscribers.forEach((off) => off())
})
</script>

<style>
.loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--icon-color);
  -webkit-app-region: drag;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.app-shell {
  height: 100vh;
  border: none !important;
}

.panel {
  overflow: hidden;
}

.sidebar-panel {
  background: var(--sidebar-bg);
}

.p-splitter-gutter {
  background: var(--p-content-border-color) !important;
}
</style>
