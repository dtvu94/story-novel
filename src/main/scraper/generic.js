import * as cheerio from 'cheerio'
import { fetchText } from './fetch.js'

const CONTENT_SELECTORS = [
  'article',
  'main',
  '#chapter-content',
  '.chapter-content',
  '.entry-content',
  '.post-content',
  '.article-content',
  '#content',
  '.content'
]

// Heuristic main-content extraction with cheerio (no heavy Readability stack).
function pickContentHtml($) {
  $('script, style, nav, header, footer, aside, form, noscript, iframe').remove()
  let best = null
  let bestLen = 0
  for (const sel of CONTENT_SELECTORS) {
    $(sel).each((_, el) => {
      const len = $(el).text().trim().length
      if (len > bestLen) {
        bestLen = len
        best = el
      }
    })
  }
  if (!best || bestLen < 200) best = $('body')[0]
  return best ? $.html(best) : ''
}

function pageTitle($) {
  return (
    $('h1').first().text().trim() ||
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    ''
  )
}

// Fallback adapter: treats a URL as a single readable article/chapter.
// Site-specific adapters (selector configs) handle table-of-contents discovery.
export const genericAdapter = {
  id: 'generic',
  name: 'Generic article',
  matches: () => true,

  async fetchMeta(url) {
    const $ = cheerio.load(await fetchText(url))
    const title = pageTitle($) || url
    return { title, author: '', cover: null, chapters: [{ title, url }] }
  },

  async fetchChapter(url) {
    const $ = cheerio.load(await fetchText(url))
    return { title: pageTitle($) || 'Chapter', html: pickContentHtml($) }
  }
}
