<template>
  <div ref="host" class="cm-host"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const host = ref(null)
let view = null
let syncing = false // true mentre aggiorniamo il doc dall'esterno (niente emit)

// I colori usano CSS variables: il tema chiaro/scuro è gestito interamente dal CSS,
// senza dover riconfigurare l'editor quando cambia il tema.
const highlightStyle = HighlightStyle.define([
  // --- markdown (prosa) ---
  {
    tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    color: 'var(--cm-heading)',
    fontWeight: '700'
  },
  { tag: t.strong, color: 'var(--cm-strong)', fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--cm-link)' },
  { tag: t.monospace, color: 'var(--cm-code)' },
  { tag: t.quote, color: 'var(--cm-quote)', fontStyle: 'italic' },
  // marcatori (# * - > ` ecc.): tenui — NON il testo della lista (tags.list),
  // che resta col colore di testo normale ed è quindi leggibile
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: 'var(--cm-meta)' },

  // --- codice nei blocchi con linguaggio (js, ecc.) ---
  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword],
    color: 'var(--cm-keyword)'
  },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--cm-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--cm-number)' },
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: 'var(--cm-comment)',
    fontStyle: 'italic'
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName],
    color: 'var(--cm-function)'
  },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--cm-type)' },
  { tag: t.propertyName, color: 'var(--cm-property)' },
  {
    tag: [t.operator, t.punctuation, t.separator, t.bracket, t.paren, t.brace, t.squareBracket],
    color: 'var(--cm-punct)'
  },
  { tag: [t.variableName, t.definition(t.variableName)], color: 'var(--cm-text)' }
])

const theme = EditorView.theme({
  '&': {
    color: 'var(--p-text-color)',
    backgroundColor: 'transparent',
    height: '100%',
    fontSize: '13px'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: "'SF Mono', ui-monospace, Menlo, Monaco, monospace",
    lineHeight: '1.7',
    overflow: 'auto'
  },
  '.cm-content': { padding: '12px 24px 40px', caretColor: 'var(--p-text-color)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--p-text-color)' },
  '.cm-selectionBackground': { backgroundColor: 'var(--cm-selection)' },
  '&.cm-focused .cm-selectionBackground, & .cm-selectionBackground': {
    backgroundColor: 'var(--cm-selection)'
  },
  '.cm-line': { padding: '0' }
})

onMounted(() => {
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(highlightStyle),
      EditorView.lineWrapping,
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !syncing) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })
    ]
  })
  view = new EditorView({ state, parent: host.value })
})

// Sincronizza il doc quando il valore cambia dall'esterno (es. cambio nota)
watch(
  () => props.modelValue,
  (next) => {
    if (!view || next === view.state.doc.toString()) return
    syncing = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next }
    })
    syncing = false
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

defineExpose({ focus: () => view?.focus() })
</script>

<style scoped>
.cm-host {
  height: 100%;
  overflow: hidden;
}
</style>
