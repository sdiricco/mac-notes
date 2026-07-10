import { marked } from 'marked'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

marked.setOptions({ breaks: true, gfm: true })

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
    const lines = Array.from(node.querySelectorAll('.ql-code-block')).map((d) => d.textContent)
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    return '\n```\n' + lines.join('\n') + '\n```\n\n'
  }
})

// Elementi di UI interni a Quill (frecce delle checklist ecc.)
turndownService.addRule('quillUi', {
  filter: (node) => node.nodeName === 'SPAN' && node.classList?.contains('ql-ui'),
  replacement: () => ''
})

export function markdownToHtml(markdown) {
  const html = marked.parse(markdown || '')
  // le task list di marked (<input type="checkbox">) diventano checklist native di Quill
  return html.replace(/<li>\s*<input([^>]*type="checkbox"[^>]*)>\s*/g, (_m, attrs) => {
    const state = /\bchecked\b/.test(attrs) ? 'checked' : 'unchecked'
    return `<li data-list="${state}">`
  })
}

export function htmlToMarkdown(html) {
  return turndownService.turndown(html || '')
}

export function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
