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

// I blocchi di codice di Quill sono <div class="ql-code-block">, non <pre>
turndownService.addRule('quillCodeBlock', {
  filter: (node) =>
    node.nodeName === 'DIV' && node.classList?.contains('ql-code-block-container'),
  replacement: (_content, node) => {
    const blocks = Array.from(node.querySelectorAll('.ql-code-block'))
    const lang = blocks[0]?.getAttribute('data-language')
    const fence = lang && lang !== 'plain' ? lang : ''
    const lines = blocks.map((d) => d.textContent)
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    return '\n```' + fence + '\n' + lines.join('\n') + '\n```\n\n'
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
  return turndownService.turndown(html || '')
}

export function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
