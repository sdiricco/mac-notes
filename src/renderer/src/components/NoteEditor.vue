<template>
  <section class="note-editor">
    <div class="editor-drag"></div>

    <div v-if="!store.selectedNote" class="empty-state">
      <Icon icon="lucide:notebook-pen" />
      <p>Seleziona una nota o creane una nuova</p>
    </div>

    <template v-else>
      <div class="editor-topbar">
        <input
          :key="store.selectedNote.id + '-title'"
          class="title-input"
          :value="store.selectedNote.title"
          placeholder="Titolo"
          @input="onTitleInput"
        />
        <div class="mode-toggle">
          <button :class="{ active: mode === 'rich' }" title="Anteprima formattata" @click="setMode('rich')">
            <Icon icon="lucide:eye" />
          </button>
          <button :class="{ active: mode === 'raw' }" title="Markdown grezzo" @click="setMode('raw')">
            <Icon icon="lucide:code" />
          </button>
        </div>
        <button
          class="icon-btn"
          :class="{ on: settings.spellcheck }"
          :title="
            settings.spellcheck
              ? `Correzione ortografica attiva (${settings.spellLang.toUpperCase()})`
              : 'Attiva correzione ortografica'
          "
          @click="settings.toggleSpellcheck()"
        >
          <Icon icon="lucide:spell-check" />
        </button>
        <button
          class="icon-btn"
          :title="store.selectedNote.pinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'"
          @click="store.togglePin(store.selectedNote.id)"
        >
          <Icon :icon="store.selectedNote.pinned ? 'lucide:star' : 'lucide:star'" :class="{ filled: store.selectedNote.pinned }" />
        </button>
        <button class="icon-btn" title="Copia come Markdown" @click="copyNote">
          <Icon icon="lucide:copy" />
        </button>
        <button
          v-if="!store.selectedNote.trashed"
          class="icon-btn"
          title="Sposta nel cestino"
          @click="store.trashNote(store.selectedNote.id)"
        >
          <Icon icon="lucide:trash-2" />
        </button>
        <button v-else class="icon-btn" title="Ripristina" @click="store.restoreNote(store.selectedNote.id)">
          <Icon icon="lucide:rotate-ccw" />
        </button>
      </div>

      <QuillEditor
        v-if="mode === 'rich'"
        :key="store.selectedNote.id"
        :note-id="store.selectedNote.id"
        :content="store.selectedNote.content"
        class="editor-body"
        @change="onContentChange"
      />
      <MarkdownSourceEditor
        v-else
        :key="store.selectedNote.id + '-raw'"
        :model-value="rawText"
        class="editor-body"
        @update:model-value="onRawInput"
      />
    </template>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { Icon } from '@iconify/vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import QuillEditor from './QuillEditor.vue'
import MarkdownSourceEditor from './MarkdownSourceEditor.vue'
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown'
import { debounce } from '../utils/debounce'

const store = useNotesStore()
const settings = useSettingsStore()
const toast = useToast()

const mode = ref('rich')
const rawText = ref('')

function setMode(next) {
  if (next === mode.value || !store.selectedNote) return
  if (next === 'raw') {
    rawText.value = htmlToMarkdown(store.selectedNote.content)
  } else {
    // applica subito le modifiche raw prima di tornare all'anteprima
    store.updateNote(store.selectedNote.id, { content: markdownToHtml(rawText.value) })
  }
  mode.value = next
}

const commitRaw = debounce(() => {
  if (mode.value !== 'raw' || !store.selectedNote) return
  store.updateNote(store.selectedNote.id, { content: markdownToHtml(rawText.value) })
}, 300)

function onRawInput(value) {
  rawText.value = value
  commitRaw()
}

watch(
  () => store.selectedNote?.id,
  () => {
    if (mode.value === 'raw' && store.selectedNote) {
      rawText.value = htmlToMarkdown(store.selectedNote.content)
    }
  }
)

function onTitleInput(event) {
  store.updateNote(store.selectedNote.id, { title: event.target.value })
}

function onContentChange(html) {
  store.updateNote(store.selectedNote.id, { content: html })
}

async function copyNote() {
  await navigator.clipboard.writeText(htmlToMarkdown(store.selectedNote.content))
  toast.add({ severity: 'success', summary: 'Copiato come Markdown', life: 1800 })
}
</script>

<style scoped>
.note-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg);
}

.editor-drag {
  height: 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color);
  gap: 8px;
}
.empty-state :deep(svg) {
  font-size: 30px;
}

.editor-topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  -webkit-app-region: drag;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--editor-bg);
  border-bottom: 1px solid var(--p-content-border-color);
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  font-size: 15px;
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}
.icon-btn:hover {
  background: var(--sidebar-hover-bg);
  color: var(--p-text-color);
}
.icon-btn.on {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.icon-btn :deep(svg.filled) {
  fill: var(--p-text-color);
  color: var(--p-text-color);
}

.title-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  color: var(--p-text-color);
  -webkit-app-region: no-drag;
  text-overflow: ellipsis;
}
.title-input::placeholder {
  color: var(--p-text-muted-color);
  font-weight: 400;
}

.editor-body {
  flex: 1;
  min-height: 0;
}

.mode-toggle {
  display: flex;
  background: var(--search-bg);
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
  -webkit-app-region: no-drag;
}
.mode-toggle button {
  border: none;
  background: transparent;
  color: var(--p-text-muted-color);
  cursor: pointer;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 13px;
  display: flex;
  align-items: center;
}
.mode-toggle button.active {
  background: var(--editor-bg);
  color: var(--p-text-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
</style>
