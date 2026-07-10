<template>
  <div class="quill-editor">
    <div ref="editorEl"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

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

function loadContent(html) {
  internalUpdate = true
  quill.setContents([])
  if (html) {
    quill.clipboard.dangerouslyPasteHTML(html)
  }
  internalUpdate = false
}

onMounted(() => {
  quill = new Quill(editorEl.value, {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions
    }
  })

  loadContent(props.content)

  quill.on('text-change', (_delta, _oldDelta, source) => {
    // solo modifiche dell'utente: il load e la normalizzazione interna non vanno salvati
    if (internalUpdate || source !== 'user') return
    emit('change', quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML)
  })
})

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
