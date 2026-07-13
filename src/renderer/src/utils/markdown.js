import { marked } from 'marked'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

marked.setOptions({ breaks: true, gfm: true })

// alias comuni dei fence → nomi canonici di highlight.js (usati come data-language
// e come chiavi del modulo Syntax di Quill; vedi CODE_LANGUAGES in QuillEditor.vue)
const LANG_ALIASES = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  html: 'xml',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  rb: 'ruby',
  rs: 'rust',
  md: 'markdown',
  golang: 'go'
}
export function normalizeLang(lang) {
  const key = (lang || '').trim().toLowerCase()
  return LANG_ALIASES[key] || key || 'plain'
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
})
turndownService.use(gfm)

// Quill usa <ol> per tutte le liste, distinguendo il tipo con data-list
turndownService.addRule('quillListItem', {
  filter: (node) => node.nodeName === 'LI' && node.getAttribute('data-list'),
  replacement: (content, node) => {
    const type = node.getAttribute('data-list')
    const body = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .replace(/\n/gm, '\n    ')
    let prefix = '- '
    if (type === 'ordered') {
      const index = Array.prototype.indexOf.call(node.parentNode.children, node) + 1
      prefix = `${index}. `
    } else if (type === 'checked') {
      prefix = '- [x] '
    } else if (type === 'unchecked') {
      prefix = '- [ ] '
    }
    return prefix + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '')
  }
})

// Il formato nativo di Quill per un blocco di codice (con il modulo Syntax attivo)
// è <pre data-language="xx">codice</pre>: turndown per default lo tratterebbe come
// <pre> generico (fence senza linguaggio), quindi leggiamo noi l'attributo.
turndownService.addRule('quillCodeBlock', {
  filter: (node) => node.nodeName === 'PRE',
  replacement: (_content, node) => {
    const lang = node.getAttribute('data-language')
    const fence = lang && lang !== 'plain' ? lang : ''
    const code = node.textContent.replace(/^\n/, '').replace(/\n$/, '')
    return '\n```' + fence + '\n' + code + '\n```\n\n'
  }
})

// Elementi di UI interni a Quill (frecce delle checklist, selettore lingua ecc.)
turndownService.addRule('quillUi', {
  filter: (node) => node.nodeName === 'SPAN' && node.classList?.contains('ql-ui'),
  replacement: () => ''
})

// Spazio unificatore (U+00A0): non viene collassato da HTML/browser, e i parser
// Markdown non lo trattano come lo spazio ASCII che innesca liste annidate o
// blocchi di codice indentati.
const NBSP = String.fromCharCode(0xa0)
const SENT = String.fromCharCode(0) // sentinella per proteggere i blocchi fenced

// Una riga è "strutturale" se la sua indentazione ha un significato per il parser
// Markdown (elenco, citazione, titolo): in questi casi lo spazio iniziale NON va
// toccato, altrimenti si rompe il riconoscimento di liste annidate ecc.
const LIST_RE = /^\s*([-*+]|\d+[.)])\s/
const BLOCKQUOTE_RE = /^\s*>/
const HEADING_RE = /^\s*#{1,6}\s/
const isStructuralLine = (line) => LIST_RE.test(line) || BLOCKQUOTE_RE.test(line) || HEADING_RE.test(line)

function expandToNbsp(whitespace) {
  let out = ''
  for (const ch of whitespace) out += ch === '\t' ? NBSP.repeat(4) : NBSP
  return out
}

// Un run di 2+ spazi (o qualunque tab) in mezzo a una riga non ha mai significato
// sintattico in Markdown: lo preserviamo sempre. Il primo spazio resta normale
// (permette comunque l'a-capo automatico), il resto diventa spazio unificatore.
function expandInlineRun(run) {
  if (run.includes('\t')) return expandToNbsp(run)
  return ' ' + NBSP.repeat(run.length - 1)
}

// Preserva la spaziatura "decorativa" (indentazione di paragrafi non in lista,
// allineamenti con più spazi) che altrimenti l'HTML collasserebbe o che innescherebbe
// la regola Markdown "4 spazi = blocco di codice". Non tocca l'indentazione di righe
// strutturali (liste, citazioni, titoli) per non comprometterne il parsing, né i
// blocchi fenced ```…``` (protetti a parte, dove la spaziatura serve al codice).
function preserveWhitespace(markdown) {
  const fences = []
  const guarded = markdown.replace(/```[\s\S]*?(?:```|$)/g, (m) => {
    fences.push(m)
    return `${SENT}${fences.length - 1}${SENT}`
  })

  const lines = guarded.split('\n').map((line) => {
    const leadMatch = line.match(/^[ \t]+/)
    const lead = leadMatch ? leadMatch[0] : ''
    const rest = line.slice(lead.length)
    const newLead = lead && !isStructuralLine(line) ? expandToNbsp(lead) : lead
    const newRest = rest.replace(/\t+| {2,}/g, expandInlineRun)
    return newLead + newRest
  })

  return lines.join('\n').replace(new RegExp(`${SENT}(\\d+)${SENT}`, 'g'), (_m, i) => fences[Number(i)])
}

// Al ritorno da HTML, ogni NBSP diventa uno spazio normale: non proviamo a
// distinguere se in origine fosse un TAB o più spazi, ci basta che la spaziatura
// visiva non collassi più.
function nbspToPlain(markdown) {
  return markdown.replace(new RegExp(NBSP, 'g'), ' ')
}

export function markdownToHtml(markdown) {
  let html = marked.parse(preserveWhitespace(markdown || ''))
  // le task list di marked (<input type="checkbox">) diventano checklist native di Quill
  html = html.replace(/<li>\s*<input([^>]*type="checkbox"[^>]*)>\s*/g, (_m, attrs) => {
    const state = /\bchecked\b/.test(attrs) ? 'checked' : 'unchecked'
    return `<li data-list="${state}">`
  })
  // blocchi di codice di marked (<pre><code class="language-xx">) → formato nativo
  // di Quill col modulo Syntax attivo: <pre data-language="xx">, che il paste di
  // Quill riconosce da solo (matchCodeBlock legge data-language dal <pre>) e
  // colora subito con highlight.js, senza bisogno di post-processing via API.
  html = html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>\s*/g,
    (_m, lang, code) => `<pre data-language="${normalizeLang(lang)}">\n${code.replace(/\n$/, '')}\n</pre>`
  )
  return html
}

export function htmlToMarkdown(html) {
  return nbspToPlain(turndownService.turndown(html || ''))
}

export function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
