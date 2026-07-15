import JSZip from 'jszip'
import * as cheerio from 'cheerio'
import { XMLParser } from 'fast-xml-parser'
import { htmlToMarkdown, extractHtmlTitle } from '../lib/html-to-markdown.js'

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
const textOf = (v) => (v && typeof v === 'object' ? v['#text'] || '' : v || '')

/** Resolve a zip-relative href against the OPF base directory. */
function resolvePath(base, href) {
  const parts = (base + href).split('/')
  const out = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p !== '.' && p !== '') out.push(p)
  }
  return out.join('/')
}

function extFromMedia(media, href) {
  if (/jpeg|jpg/.test(media)) return '.jpg'
  if (/png/.test(media)) return '.png'
  if (/gif/.test(media)) return '.gif'
  if (/webp/.test(media)) return '.webp'
  const m = href?.match(/\.[a-z0-9]+$/i)
  return m ? m[0].toLowerCase() : '.jpg'
}

/**
 * Parse an EPUB buffer into a book payload.
 * @returns {Promise<{book:{title:string,author:string,chapters:Array},cover:{data:Uint8Array,ext:string}|null}>}
 */
export async function importEpubBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer)

  const containerXml = await zip.file('META-INF/container.xml').async('string')
  const container = xml.parse(containerXml)
  const rootfile = asArray(container?.container?.rootfiles?.rootfile)[0]
  const opfPath = rootfile['@_full-path']
  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  const pkg = xml.parse(await zip.file(opfPath).async('string')).package
  const meta = pkg.metadata || {}
  const title = textOf(meta['dc:title']) || 'Imported book'
  const author = textOf(asArray(meta['dc:creator'])[0]) || ''

  // manifest: id -> { href, media, properties }
  const manifest = {}
  for (const item of asArray(pkg.manifest?.item)) {
    manifest[item['@_id']] = {
      href: item['@_href'],
      media: item['@_media-type'] || '',
      properties: item['@_properties'] || ''
    }
  }

  // Cover: explicit meta[name=cover] or manifest item flagged cover-image.
  let coverId = asArray(meta.meta).find((m) => m['@_name'] === 'cover')?.['@_content']
  if (!coverId) {
    coverId = Object.keys(manifest).find((id) => /cover-image/.test(manifest[id].properties))
  }
  if (!coverId) {
    coverId = Object.keys(manifest).find(
      (id) => /image\//.test(manifest[id].media) && /cover/i.test(manifest[id].href)
    )
  }

  let cover = null
  if (coverId && manifest[coverId]) {
    const item = manifest[coverId]
    const f = zip.file(resolvePath(baseDir, item.href))
    if (f) {
      cover = { data: await f.async('uint8array'), ext: extFromMedia(item.media, item.href) }
    }
  }

  // Extracted chapter images -> written into the book's assets folder later.
  const images = []
  const imgByPath = new Map()
  let imgSeq = 0
  async function registerImage(epubPath) {
    if (imgByPath.has(epubPath)) return imgByPath.get(epubPath)
    const f = zip.file(epubPath)
    if (!f) return null
    const ext = epubPath.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() || '.img'
    const name = `img-${++imgSeq}${ext}`
    images.push({ name, data: await f.async('uint8array') })
    imgByPath.set(epubPath, name)
    return name
  }

  // Chapters follow the spine order.
  const chapters = []
  for (const ref of asArray(pkg.spine?.itemref)) {
    const item = manifest[ref['@_idref']]
    if (!item || !/html|xml/.test(item.media)) continue
    const htmlFull = resolvePath(baseDir, item.href)
    const f = zip.file(htmlFull)
    if (!f) continue
    const html = await f.async('string')
    const htmlDir = htmlFull.includes('/') ? htmlFull.slice(0, htmlFull.lastIndexOf('/') + 1) : ''

    // Pre-resolve <img> sources to saved asset names (async), then render sync.
    const $ = cheerio.load(html)
    const srcMap = new Map()
    for (const el of $('img').toArray()) {
      const src = el.attribs?.src
      if (!src || /^data:/.test(src)) continue
      const name = await registerImage(resolvePath(htmlDir, src))
      if (name) srcMap.set(src, `assets/${name}`)
    }

    const markdown = htmlToMarkdown(html, { resolveImg: (src) => srcMap.get(src) || null })
    if (!markdown.trim()) continue
    chapters.push({
      title: extractHtmlTitle(html) || `Section ${chapters.length + 1}`,
      markdown
    })
  }

  return { book: { title, author, chapters }, cover, images }
}
