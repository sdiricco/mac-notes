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

// Elementi di UI interni a Quill (frecce delle checklist ecc.)
turndownService.addRule('quillUi', {
  filter: (node) => node.nodeName === 'SPAN' && node.classList?.contains('ql-ui'),
  replacement: () => ''
})

export function markdownToHtml(markdown) {
  let html = marked.parse(markdown || '')
  // le task list di marked (<input type="checkbox">) diventano checklist native di Quill
  html = html.replace(/<li>\s*<input([^>]*type="checkbox"[^>]*)>\s*/g, (_m, attrs) => {
    const state = /\bchecked\b/.test(attrs) ? 'checked' : 'unchecked'
    return `<li data-list="${state}">`
  })
  // blocchi di codice di marked (<pre><code class="language-xx">) → formato nativo Quill
  // (.ql-code-block-container con data-language) così Quill+highlight.js li evidenzia
  html = html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>\s*/g,
    (_m, lang, code) => {
      const language = normalizeLang(lang)
      const body = code.replace(/\n$/, '')
      const lines = body.length ? body.split('\n') : ['']
      const inner = lines
        .map((l) => `<div class="ql-code-block" data-language="${language}">${l}</div>`)
        .join('')
      return `<div class="ql-code-block-container" spellcheck="false">${inner}</div>`
    }
  )
  return html
}

export function htmlToMarkdown(html) {
  // Converto i blocchi di codice di Quill (<div class="ql-code-block">) in <pre><code>
  // prima di turndown: turndown collassa gli spazi negli elementi non-<pre>, mentre
  // dentro <pre> li preserva. Così tab e indentazione del codice sopravvivono al roundtrip.
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  doc.querySelectorAll('.ql-code-block-container').forEach((cont) => {
    const blocks = [...cont.querySelectorAll('.ql-code-block')]
    if (!blocks.length) return
    const lang = blocks[0].getAttribute('data-language')
    const pre = doc.createElement('pre')
    const code = doc.createElement('code')
    if (lang && lang !== 'plain') code.className = `language-${lang}`
    code.textContent = blocks.map((b) => b.textContent).join('\n')
    pre.appendChild(code)
    cont.replaceWith(pre)
  })
  return turndownService.turndown(doc.body.innerHTML)
}

export function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
