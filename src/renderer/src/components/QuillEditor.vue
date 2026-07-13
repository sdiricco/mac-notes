<template>
  <div class="quill-editor">
    <div ref="editorEl"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import hljs from 'highlight.js/lib/common'
import 'quill/dist/quill.snow.css'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()

const props = defineProps({
  noteId: { type: String, default: null },
  content: { type: String, default: '' }
})

const emit = defineEmits(['change'])

const editorEl = ref(null)
let quill = null
let internalUpdate = false

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  ['blockquote', 'code-block', 'link'],
  ['clean']
]

// chiavi = nomi canonici di highlight.js (coerenti con normalizeLang in markdown.js)
const CODE_LANGUAGES = [
  { key: 'plain', label: 'Testo' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'python', label: 'Python' },
  { key: 'bash', label: 'Bash' },
  { key: 'json', label: 'JSON' },
  { key: 'yaml', label: 'YAML' },
  { key: 'xml', label: 'HTML/XML' },
  { key: 'css', label: 'CSS' },
  { key: 'scss', label: 'SCSS' },
  { key: 'java', label: 'Java' },
  { key: 'csharp', label: 'C#' },
  { key: 'cpp', label: 'C++' },
  { key: 'c', label: 'C' },
  { key: 'go', label: 'Go' },
  { key: 'rust', label: 'Rust' },
  { key: 'ruby', label: 'Ruby' },
  { key: 'php', label: 'PHP' },
  { key: 'sql', label: 'SQL' },
  { key: 'markdown', label: 'Markdown' }
]

function loadContent(html) {
  internalUpdate = true
  quill.setContents([])
  // Il paste di Quill (con modulo Syntax attivo) legge da solo data-language dal
  // <pre> e applica l'evidenziazione: nessun post-processing manuale necessario.
  if (html) quill.clipboard.dangerouslyPasteHTML(html)
  internalUpdate = false
}

// Scorciatoie di formattazione (in aggiunta a ⌘B/⌘I/⌘U nativi di Quill).
// Uso i keyCode numerici: shift+numero/lettera cambia evt.key a seconda del layout,
// mentre il keyCode resta stabile.
const toggle = (quill, range, name, value, current) =>
  quill.format(name, current === value ? false : value, 'user')

const editorBindings = {
  strike: { key: 88, shortKey: true, shiftKey: true, handler(r, c) { toggle(this.quill, r, 'strike', true, c.format.strike); return false } },
  h1: { key: 49, shortKey: true, altKey: true, handler(r, c) { toggle(this.quill, r, 'header', 1, c.format.header); return false } },
  h2: { key: 50, shortKey: true, altKey: true, handler(r, c) { toggle(this.quill, r, 'header', 2, c.format.header); return false } },
  h3: { key: 51, shortKey: true, altKey: true, handler(r, c) { toggle(this.quill, r, 'header', 3, c.format.header); return false } },
  normal: { key: 48, shortKey: true, altKey: true, handler() { this.quill.format('header', false, 'user'); return false } },
  orderedList: { key: 55, shortKey: true, shiftKey: true, handler(r, c) { toggle(this.quill, r, 'list', 'ordered', c.format.list); return false } },
  bulletList: { key: 56, shortKey: true, shiftKey: true, handler(r, c) { toggle(this.quill, r, 'list', 'bullet', c.format.list); return false } },
  checkList: { key: 57, shortKey: true, shiftKey: true, handler(r, c) { const on = c.format.list === 'checked' || c.format.list === 'unchecked'; this.quill.format('list', on ? false : 'unchecked', 'user'); return false } },
  blockquote: { key: 66, shortKey: true, shiftKey: true, handler(r, c) { this.quill.format('blockquote', !c.format.blockquote, 'user'); return false } },
  codeBlock: { key: 67, shortKey: true, shiftKey: true, handler(r, c) { this.quill.format('code-block', !c.format['code-block'], 'user'); return false } },
  link: { key: 75, shortKey: true, handler(r) { if (r && r.length > 0) { const url = window.prompt('Indirizzo del link'); if (url) this.quill.format('link', url, 'user') } return false } }
}

onMounted(() => {
  quill = new Quill(editorEl.value, {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions,
      syntax: { hljs, languages: CODE_LANGUAGES },
      keyboard: { bindings: editorBindings }
    }
  })

  loadContent(props.content)
  applySpellcheck()

  quill.on('text-change', (_delta, _oldDelta, source) => {
    // solo modifiche dell'utente: il load e la normalizzazione interna non vanno salvati
    if (internalUpdate || source !== 'user') return
    // getSemanticHTML() serializza dal modello Delta, escludendo gli elementi UI
    // iniettati nel DOM (es. il <select> lingua dei code block): quill.root.innerHTML
    // includerebbe quel <select>, facendolo finire salvato nel contenuto della nota.
    const html = quill.getSemanticHTML()
    emit('change', html === '<p><br></p>' ? '' : html)
  })
})

function applySpellcheck() {
  if (!quill) return
  quill.root.setAttribute('spellcheck', settings.spellcheck ? 'true' : 'false')
  if (settings.spellcheck) quill.root.setAttribute('lang', settings.spellLang)
  else quill.root.removeAttribute('lang')
}

watch(() => [settings.spellcheck, settings.spellLang], applySpellcheck)

watch(
  () => props.noteId,
  () => {
    if (!quill) return
    loadContent(props.content)
  }
)

function focusEditor() {
  quill?.focus()
}

defineExpose({ focusEditor })

onBeforeUnmount(() => {
  quill = null
})
</script>

<style scoped>
.quill-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ---- Toolbar: compatta e neutra ---- */
.quill-editor :deep(.ql-toolbar) {
  border: none;
  border-bottom: 1px solid var(--p-content-border-color);
  padding: 6px 16px;
  background: var(--editor-toolbar-bg);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.quill-editor :deep(.ql-toolbar .ql-formats) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 10px;
  padding-right: 10px;
  border-right: 1px solid var(--p-content-border-color);
}
.quill-editor :deep(.ql-toolbar .ql-formats:last-child) {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}

.quill-editor :deep(.ql-toolbar button) {
  width: 26px;
  height: 24px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
}
.quill-editor :deep(.ql-toolbar button:hover),
.quill-editor :deep(.ql-toolbar button.ql-active) {
  background: var(--selection-bg);
}

/* Icone: sempre grigio neutro, testo pieno quando attive */
.quill-editor :deep(.ql-snow .ql-stroke) {
  stroke: var(--icon-color);
}
.quill-editor :deep(.ql-snow .ql-fill) {
  fill: var(--icon-color);
}
.quill-editor :deep(.ql-toolbar button:hover .ql-stroke),
.quill-editor :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: var(--p-text-color);
}
.quill-editor :deep(.ql-toolbar button:hover .ql-fill),
.quill-editor :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: var(--p-text-color);
}

/* Dropdown dei titoli */
.quill-editor :deep(.ql-toolbar .ql-picker) {
  color: var(--icon-color);
  font-size: 12px;
  height: 24px;
}
.quill-editor :deep(.ql-toolbar .ql-picker-label) {
  border: none;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  padding: 0 20px 0 8px;
}
.quill-editor :deep(.ql-toolbar .ql-picker-label:hover),
.quill-editor :deep(.ql-snow .ql-picker.ql-expanded .ql-picker-label) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.quill-editor :deep(.ql-toolbar .ql-picker-label:hover .ql-stroke),
.quill-editor :deep(.ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-stroke) {
  stroke: var(--p-text-color);
}
.quill-editor :deep(.ql-toolbar .ql-picker-options) {
  background: var(--editor-bg);
  border: 1px solid var(--p-content-border-color) !important;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 4px;
  margin-top: 4px;
}
.quill-editor :deep(.ql-toolbar .ql-picker-item) {
  border-radius: 5px;
  padding: 3px 10px;
  color: var(--p-text-color);
}
.quill-editor :deep(.ql-toolbar .ql-picker-item:hover) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.quill-editor :deep(.ql-toolbar .ql-picker-item.ql-selected) {
  color: var(--p-text-color);
  font-weight: 600;
}

.quill-editor :deep(.ql-container) {
  border: none;
  flex: 1;
  overflow-y: auto;
  font-family: inherit;
  font-size: 15px;
}

.quill-editor :deep(.ql-editor) {
  padding: 12px 24px 40px;
  line-height: 1.6;
}

.quill-editor :deep(.ql-editor.ql-blank::before) {
  color: var(--p-text-muted-color);
  font-style: normal;
  left: 24px;
}

.quill-editor :deep(.ql-editor code) {
  background: var(--search-bg);
  color: var(--p-text-color);
  border-radius: 4px;
  padding: 1px 5px;
}

.quill-editor :deep(.ql-editor .ql-code-block-container) {
  background: var(--search-bg);
  color: var(--p-text-color);
  border-radius: 8px;
  padding: 10px 14px;
}

/* syntax highlighting dei blocchi di codice (modulo Syntax di Quill + highlight.js),
   mappato sulle stesse CSS variables del raw editor per coerenza chiaro/scuro */
.quill-editor :deep(.ql-code-block-container .hljs-keyword),
.quill-editor :deep(.ql-code-block-container .hljs-selector-tag),
.quill-editor :deep(.ql-code-block-container .hljs-built_in),
.quill-editor :deep(.ql-code-block-container .hljs-meta .hljs-keyword) {
  color: var(--cm-keyword);
}
.quill-editor :deep(.ql-code-block-container .hljs-string),
.quill-editor :deep(.ql-code-block-container .hljs-regexp),
.quill-editor :deep(.ql-code-block-container .hljs-template-string),
.quill-editor :deep(.ql-code-block-container .hljs-symbol) {
  color: var(--cm-string);
}
.quill-editor :deep(.ql-code-block-container .hljs-number),
.quill-editor :deep(.ql-code-block-container .hljs-literal) {
  color: var(--cm-number);
}
.quill-editor :deep(.ql-code-block-container .hljs-comment),
.quill-editor :deep(.ql-code-block-container .hljs-quote) {
  color: var(--cm-comment);
  font-style: italic;
}
.quill-editor :deep(.ql-code-block-container .hljs-title),
.quill-editor :deep(.ql-code-block-container .hljs-title.function_),
.quill-editor :deep(.ql-code-block-container .hljs-section) {
  color: var(--cm-function);
}
.quill-editor :deep(.ql-code-block-container .hljs-type),
.quill-editor :deep(.ql-code-block-container .hljs-title.class_),
.quill-editor :deep(.ql-code-block-container .hljs-class .hljs-title) {
  color: var(--cm-type);
}
.quill-editor :deep(.ql-code-block-container .hljs-attr),
.quill-editor :deep(.ql-code-block-container .hljs-attribute),
.quill-editor :deep(.ql-code-block-container .hljs-property) {
  color: var(--cm-property);
}
.quill-editor :deep(.ql-code-block-container .hljs-variable),
.quill-editor :deep(.ql-code-block-container .hljs-params) {
  color: var(--cm-text);
}
.quill-editor :deep(.ql-code-block-container .hljs-punctuation),
.quill-editor :deep(.ql-code-block-container .hljs-operator) {
  color: var(--cm-punct);
}
/* selettore lingua che il modulo aggiunge a ogni blocco */
.quill-editor :deep(.ql-code-block-container .ql-ui) {
  color: var(--p-text-muted-color);
  right: 6px;
}

/* Quill Snow usa #06c hardcoded su stati attivi/espansi: forziamo il neutro */
.quill-editor :deep(.ql-snow .ql-toolbar button.ql-active),
.quill-editor :deep(.ql-snow.ql-toolbar button.ql-active),
.quill-editor :deep(.ql-snow .ql-picker-label.ql-active),
.quill-editor :deep(.ql-snow .ql-picker.ql-expanded .ql-picker-label),
.quill-editor :deep(.ql-snow .ql-picker-item.ql-selected),
.quill-editor :deep(.ql-snow .ql-picker-item:hover) {
  color: var(--p-text-color) !important;
}
.quill-editor :deep(.ql-snow .ql-toolbar button.ql-active .ql-stroke),
.quill-editor :deep(.ql-snow.ql-toolbar button.ql-active .ql-stroke),
.quill-editor :deep(.ql-snow .ql-picker-label.ql-active .ql-stroke),
.quill-editor :deep(.ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-stroke),
.quill-editor :deep(.ql-snow .ql-picker-item:hover .ql-stroke) {
  stroke: var(--p-text-color) !important;
}
.quill-editor :deep(.ql-snow .ql-toolbar button.ql-active .ql-fill),
.quill-editor :deep(.ql-snow.ql-toolbar button.ql-active .ql-fill) {
  fill: var(--p-text-color) !important;
}
</style>
