<template>
  <div class="quill-editor">
    <div ref="editorEl"></div>
    <div
      v-if="tableMenu.visible"
      ref="tableMenuEl"
      class="table-context-menu"
      :style="{ left: tableMenu.x + 'px', top: tableMenu.y + 'px' }"
    >
      <button
        v-for="action in TABLE_ACTIONS"
        :key="action.value"
        :class="{ danger: action.value.startsWith('delete') }"
        @click="runTableAction(action.value)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Quill from 'quill'
import hljs from 'highlight.js/lib/common'
import 'quill/dist/quill.snow.css'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()

const props = defineProps({
  noteId: { type: String, default: null },
  content: { type: String, default: '' },
  // Contenitore DOM esterno (rif. da NoteEditor.vue) dove montare la toolbar
  // di formattazione, così può stare visivamente sopra ai pulsanti azione
  // invece che nella posizione dove Quill la inserirebbe di default.
  toolbarContainer: { type: Object, default: null }
})

const emit = defineEmits(['change'])

const editorEl = ref(null)
let quill = null
let internalUpdate = false

// Azioni sulla tabella (righe/colonne): esposte tramite menu contestuale al
// tasto destro su una cella (vedi openTableMenu), non nella toolbar.
const TABLE_ACTIONS = [
  { value: 'insertRowAbove', label: 'Inserisci riga sopra' },
  { value: 'insertRowBelow', label: 'Inserisci riga sotto' },
  { value: 'insertColumnLeft', label: 'Inserisci colonna a sinistra' },
  { value: 'insertColumnRight', label: 'Inserisci colonna a destra' },
  { value: 'deleteRow', label: 'Elimina riga' },
  { value: 'deleteColumn', label: 'Elimina colonna' },
  { value: 'deleteTable', label: 'Elimina tabella' }
]

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: ['ordered', 'bullet', 'unchecked', false] }],
  ['blockquote', 'code-block', 'link'],
  ['table'],
  ['clean']
]

// Markup equivalente a toolbarOptions, per quando la toolbar vive in un
// contenitore esterno: Quill non genera l'HTML in quel caso (lo fa solo per
// un array passato come modules.toolbar), ma la sua theme "snow" continua a
// riconoscere queste classi e ad aggiungere le icone automaticamente.
const TOOLBAR_HTML = `
  <span class="ql-formats">
    <select class="ql-header">
      <option value="1"></option>
      <option value="2"></option>
      <option value="3"></option>
      <option selected></option>
    </select>
  </span>
  <span class="ql-formats">
    <button class="ql-bold" type="button"></button>
    <button class="ql-italic" type="button"></button>
    <button class="ql-underline" type="button"></button>
    <button class="ql-strike" type="button"></button>
  </span>
  <span class="ql-formats">
    <select class="ql-color"></select>
    <select class="ql-background"></select>
  </span>
  <span class="ql-formats">
    <select class="ql-list">
      <option value="ordered"></option>
      <option value="bullet"></option>
      <option value="unchecked"></option>
      <option selected></option>
    </select>
  </span>
  <span class="ql-formats">
    <button class="ql-blockquote" type="button"></button>
    <button class="ql-code-block" type="button"></button>
    <button class="ql-link" type="button"></button>
  </span>
  <span class="ql-formats">
    <button class="ql-table" type="button"></button>
  </span>
  <span class="ql-formats">
    <button class="ql-clean" type="button"></button>
  </span>
`

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

// Il bottone tabella non corrisponde a un toggle di formattazione: inserisce
// una tabella 2x2 alla posizione del cursore tramite il modulo Table di Quill.
function insertTable() {
  this.quill.getModule('table')?.insertTable(2, 2)
}

// Righe/colonne: menu contestuale al tasto destro su una cella. Le API del
// modulo Table agiscono sulla cella/tabella dove si trova il cursore, che il
// browser posiziona già correttamente al mousedown del tasto destro (prima
// che l'evento 'contextmenu' arrivi), quindi non serve impostarla a mano.
const tableMenuEl = ref(null)
const tableMenu = reactive({ visible: false, x: 0, y: 0 })

async function openTableMenu(event) {
  if (!event.target.closest('td') || !quill.getModule('table')) return
  event.preventDefault()
  tableMenu.x = event.clientX
  tableMenu.y = event.clientY
  tableMenu.visible = true
  // il menu può uscire dal viewport se il click è vicino al bordo destro/basso
  // della finestra: lo si riposiziona solo dopo che è nel DOM (serve la sua misura reale).
  await nextTick()
  const rect = tableMenuEl.value?.getBoundingClientRect()
  if (!rect) return
  const margin = 8
  if (rect.right > window.innerWidth - margin) tableMenu.x -= rect.right - (window.innerWidth - margin)
  if (rect.bottom > window.innerHeight - margin) tableMenu.y -= rect.bottom - (window.innerHeight - margin)
}

function closeTableMenu() {
  tableMenu.visible = false
}

function runTableAction(value) {
  quill.getModule('table')?.[value]?.()
  closeTableMenu()
}

function onGlobalMousedown(event) {
  if (tableMenu.visible && !tableMenuEl.value?.contains(event.target)) {
    closeTableMenu()
  }
}

onMounted(async () => {
  // Al primissimo mount della vista, il ref del contenitore esterno (passato
  // dal genitore) può risultare ancora null qui: viene assegnato durante il
  // mount dell'elemento fratello nella STESSA passata di render in cui questo
  // componente calcola le sue props, quindi il valore "fresco" arriva un tick
  // dopo. Aspettarlo evita di ricadere sulla toolbar generata da Quill nella
  // sua posizione/stile di default.
  await nextTick()

  let toolbarContainer = toolbarOptions
  if (props.toolbarContainer) {
    props.toolbarContainer.innerHTML = TOOLBAR_HTML
    toolbarContainer = props.toolbarContainer
  }

  quill = new Quill(editorEl.value, {
    theme: 'snow',
    modules: {
      toolbar: { container: toolbarContainer, handlers: { table: insertTable } },
      table: true,
      syntax: { hljs, languages: CODE_LANGUAGES },
      keyboard: { bindings: editorBindings }
    }
  })

  loadContent(props.content)
  applySpellcheck()
  quill.root.addEventListener('contextmenu', openTableMenu)
  window.addEventListener('mousedown', onGlobalMousedown)

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
  window.removeEventListener('mousedown', onGlobalMousedown)
  quill = null
})
</script>

<style scoped>
.quill-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Menu contestuale righe/colonne: aperto al tasto destro su una cella (vedi
   openTableMenu), posizionato al punto del click con position:fixed così le
   coordinate client (event.clientX/Y) valgono senza calcoli di scroll. */
.table-context-menu {
  position: fixed;
  z-index: 20;
  min-width: 190px;
  background: var(--editor-toolbar-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.table-context-menu button {
  border: none;
  background: transparent;
  color: var(--p-text-color);
  text-align: left;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
}
.table-context-menu button:hover {
  background: var(--selection-bg);
}
.table-context-menu button.danger {
  color: #e5484d;
}
.table-context-menu button.danger:hover {
  background: rgba(229, 72, 77, 0.14);
}
.table-context-menu button.danger:first-of-type {
  margin-top: 4px;
  border-top: 1px solid var(--p-content-border-color);
  padding-top: 8px;
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

/* Il default di Quill usa un bordo #000 fisso: non va bene sul tema scuro */
.quill-editor :deep(.ql-editor table td) {
  border-color: var(--p-content-border-color);
  min-width: 60px;
}

/* Spazio unificatore usato per preservare TAB/indentazione nel testo importato
   da Markdown (vedi wrapNbspInMonospace in utils/markdown.js): va reso in un
   font monospace altrimenti la sua larghezza varierebbe col font proporzionale. */
.quill-editor :deep(.ql-editor .ql-font-monospace) {
  font-family: 'SF Mono', ui-monospace, Menlo, Monaco, monospace;
  font-size: 13px;
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
/* Selettore lingua che il modulo Syntax aggiunge a ogni blocco: è un <select>
   nativo, qui spogliato del chrome di sistema (appearance:none + freccia SVG
   propria) per farlo somigliare a un chip dell'app invece che a un controllo
   del sistema operativo. */
.quill-editor :deep(.ql-code-block-container .ql-ui) {
  top: 6px;
  right: 6px;
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background-color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%239a9a9a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 11px;
  color: var(--p-text-muted-color);
  font-size: 12px;
  font-family: inherit;
  border-radius: 6px;
  padding: 3px 20px 3px 6px;
  cursor: pointer;
}
.quill-editor :deep(.ql-code-block-container .ql-ui:hover) {
  color: var(--p-text-color);
}
.quill-editor :deep(.ql-code-block-container .ql-ui:focus) {
  outline: none;
}
.quill-editor :deep(.ql-code-block-container .ql-ui option) {
  background: var(--card-bg);
  color: var(--p-text-color);
}
</style>
