<template>
  <section class="note-editor">
    <div class="editor-drag"></div>

    <div v-if="!store.selectedNote" class="empty-state">
      <Icon icon="lucide:notebook-pen" />
      <p>Seleziona una nota o creane una nuova</p>
    </div>

    <template v-else>
      <div class="editor-header">
        <!-- Toolbar di formattazione di Quill: montata qui (contenitore esterno,
             vedi toolbar-container su QuillEditor) per stare sopra ai pulsanti
             azione invece che nella posizione di default. -->
        <div ref="quillToolbarEl" class="floating-toolbar"></div>

        <div class="action-card">
          <button class="icon-btn" title="Importa Markdown" @click="importNote">
            <Icon icon="lucide:upload" />
          </button>
          <button class="icon-btn" title="Esporta come Markdown" @click="exportNote">
            <Icon icon="lucide:download" />
          </button>
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
            <Icon icon="lucide:star" :class="{ filled: store.selectedNote.pinned }" />
          </button>
          <button class="icon-btn" title="Copia come Markdown" @click="copyNote">
            <Icon icon="lucide:copy" />
          </button>
          <button class="icon-btn" title="Mostra la cartella delle note nel Finder" @click="api.revealDataFile()">
            <Icon icon="lucide:folder-open" />
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
      </div>

      <QuillEditor
        :key="`${store.selectedNote.id}-${reloadCounter}`"
        :note-id="store.selectedNote.id"
        :content="store.selectedNote.content"
        :toolbar-container="quillToolbarEl"
        class="editor-body"
        @change="onContentChange"
      />
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { Icon } from '@iconify/vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import QuillEditor from './QuillEditor.vue'
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown'
import { api } from '../utils/api'

const store = useNotesStore()
const settings = useSettingsStore()
const toast = useToast()

const quillToolbarEl = ref(null)
// L'import sostituisce il contenuto della nota già aperta: QuillEditor lo ricarica
// solo quando cambia il suo :key (osserva solo noteId, non il content prop), quindi
// serve forzare un remount incrementando questo contatore.
const reloadCounter = ref(0)

function onContentChange(html) {
  store.updateNote(store.selectedNote.id, { content: html })
}

function suggestedFileName() {
  const title = store.selectedNote.title?.trim()
  return title ? title.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) : 'nota'
}

async function exportNote() {
  const markdown = htmlToMarkdown(store.selectedNote.content)
  const result = await api.exportMarkdown(markdown, suggestedFileName())
  if (result) toast.add({ severity: 'success', summary: 'Nota esportata come Markdown', life: 1800 })
}

async function importNote() {
  const result = await api.importMarkdown()
  if (!result) return
  store.updateNote(store.selectedNote.id, { content: markdownToHtml(result.markdown) })
  reloadCounter.value++
  toast.add({ severity: 'success', summary: 'Markdown importato nella nota', life: 1800 })
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

.editor-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 2px 16px 6px;
  -webkit-app-region: drag;
  background: var(--editor-bg);
}

.action-card {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
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

.editor-body {
  flex: 1;
  min-height: 0;
}

/* ---- Toolbar floating e card delle azioni: due pillole arrotondate con la
   stessa identità visiva, larghe solo quanto il loro contenuto (fit-content),
   centrate nell'header. Il contenuto della toolbar (bottoni/select) è iniettato
   da Quill in modo imperativo: serve :deep() perché non fa parte del template
   compilato di questo componente. ---- */
.floating-toolbar,
.action-card {
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  padding: 3px 8px;
  background: var(--editor-toolbar-bg);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  -webkit-app-region: no-drag;
}

.floating-toolbar :deep(.ql-formats) {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-right: 6px;
  padding-right: 6px;
  border-right: 1px solid var(--p-content-border-color);
}
.floating-toolbar :deep(.ql-formats:last-child) {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}

.floating-toolbar :deep(button) {
  width: 25px;
  height: 25px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
}
.floating-toolbar :deep(button:hover),
.floating-toolbar :deep(button.ql-active) {
  background: var(--selection-bg);
}

.floating-toolbar :deep(.ql-stroke) {
  stroke: var(--icon-color);
}
.floating-toolbar :deep(.ql-fill) {
  fill: var(--icon-color);
}
.floating-toolbar :deep(button:hover .ql-stroke),
.floating-toolbar :deep(button.ql-active .ql-stroke) {
  stroke: var(--p-text-color);
}
.floating-toolbar :deep(button:hover .ql-fill),
.floating-toolbar :deep(button.ql-active .ql-fill) {
  fill: var(--p-text-color);
}

.floating-toolbar :deep(.ql-picker) {
  color: var(--icon-color);
  font-size: 11px;
  height: 25px;
}
.floating-toolbar :deep(.ql-picker-label) {
  border: none;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px 0 6px;
}
.floating-toolbar :deep(.ql-picker-label:hover),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}

/* Etichette compatte: "H1/H2/H3/¶" invece di "Heading 1/2/3/Normal", e select
   più stretta di conseguenza. Idem per il gruppo liste, che ora è un unico
   menu a discesa invece di tre bottoni separati. */
.floating-toolbar :deep(.ql-picker.ql-header) {
  width: 40px;
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label)::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item)::before {
  content: '¶';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='1'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='1'])::before {
  content: 'H1';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='2'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='2'])::before {
  content: 'H2';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='3'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='3'])::before {
  content: 'H3';
}

.floating-toolbar :deep(.ql-picker.ql-list) {
  width: 78px;
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label)::before {
  content: 'Lista';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='ordered'])::before {
  content: 'Numerata';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='bullet'])::before {
  content: 'Puntata';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='unchecked'])::before {
  content: 'Checklist';
}

/* Nelle voci del menu (aperto) un glifo davanti al testo aiuta a distinguere
   subito il tipo di lista, invece del solo nome. */
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item)::before {
  content: '– Lista';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='ordered'])::before {
  content: '1. Numerata';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='bullet'])::before {
  content: '• Puntata';
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='unchecked'])::before {
  content: '☑ Checklist';
}

/* Color/background: la label mostra l'icona del pennarello, non un testo con
   freccia a discesa, quindi serve un padding ridotto e simmetrico: col padding
   pensato per gli altri select (8px/20px) l'icona SVG finiva senza spazio
   disponibile e collassava a larghezza 0. */
.floating-toolbar :deep(.ql-color-picker .ql-picker-label),
.floating-toolbar :deep(.ql-icon-picker .ql-picker-label) {
  padding: 2px 4px;
}
.floating-toolbar :deep(.ql-picker-label:hover .ql-stroke),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label .ql-stroke) {
  stroke: var(--p-text-color);
}
.floating-toolbar :deep(.ql-picker-options) {
  background: var(--editor-bg);
  border: 1px solid var(--p-content-border-color) !important;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 4px;
  margin-top: 4px;
}
.floating-toolbar :deep(.ql-picker-item) {
  border-radius: 5px;
  padding: 3px 10px;
  color: var(--p-text-color);
}
.floating-toolbar :deep(.ql-picker-item:hover) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.floating-toolbar :deep(.ql-picker-item.ql-selected) {
  color: var(--p-text-color);
  font-weight: 600;
}

/* Quill Snow usa #06c hardcoded su stati attivi/espansi: forziamo il neutro */
.floating-toolbar :deep(button.ql-active),
.floating-toolbar :deep(.ql-picker-label.ql-active),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label),
.floating-toolbar :deep(.ql-picker-item.ql-selected),
.floating-toolbar :deep(.ql-picker-item:hover) {
  color: var(--p-text-color) !important;
}
.floating-toolbar :deep(button.ql-active .ql-stroke),
.floating-toolbar :deep(.ql-picker-label.ql-active .ql-stroke),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label .ql-stroke),
.floating-toolbar :deep(.ql-picker-item:hover .ql-stroke) {
  stroke: var(--p-text-color) !important;
}
.floating-toolbar :deep(button.ql-active .ql-fill) {
  fill: var(--p-text-color) !important;
}
</style>
