import * as cheerio from 'cheerio'

function render(node, opts) {
  if (!node) return ''
  if (node.type === 'text') return (node.data || '').replace(/\s+/g, ' ')
  if (node.type !== 'tag') return ''

  const tag = (node.name || '').toLowerCase()
  const inner = () => (node.children || []).map((c) => render(c, opts)).join('')

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n\n${'#'.repeat(Number(tag[1]))} ${inner().trim()}\n\n`
    case 'p':
      return `\n\n${inner().trim()}\n\n`
    case 'br':
      return '  \n'
    case 'hr':
      return '\n\n---\n\n'
    case 'strong':
    case 'b': {
      const t = inner().trim()
      return t ? `**${t}**` : ''
    }
    case 'em':
    case 'i': {
      const t = inner().trim()
      return t ? `*${t}*` : ''
    }
    case 'blockquote':
      return `\n\n${inner()
        .trim()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')}\n\n`
    case 'li':
      return `- ${inner().trim()}\n`
    case 'ul':
    case 'ol':
      return `\n\n${inner().trim()}\n\n`
    case 'a':
      return inner()
    case 'img': {
      const src = node.attribs?.src || ''
      const alt = (node.attribs?.alt || '').replace(/[[\]]/g, '')
      const url = opts.resolveImg ? opts.resolveImg(src) : null
      return url ? `\n\n![${alt}](${url})\n\n` : ''
    }
    case 'script':
    case 'style':
    case 'head':
    case 'nav':
      return ''
    default:
      return inner()
  }
}

/**
 * Convert an HTML fragment/document body into readable markdown.
 * @param {string} html
 * @param {{resolveImg?: (src:string)=>string|null}} [opts]
 */
export function htmlToMarkdown(html, opts = {}) {
  const $ = cheerio.load(html)
  const root = $('body').length ? $('body')[0] : $.root()[0]
  const out = (root.children || []).map((c) => render(c, opts)).join('')
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Best-effort document title from an (x)html document. */
export function extractHtmlTitle(html) {
  const $ = cheerio.load(html)
  const t =
    $('h1').first().text().trim() ||
    $('h2').first().text().trim() ||
    $('title').first().text().trim()
  return t || ''
}
