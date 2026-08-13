import * as cheerio from 'cheerio'
import { createHash } from 'node:crypto'
import { fetchText, throttleHost } from '../fetch.js'

// WikiDich (currently wikicv.org). The site changes domain regularly, so all
// requests are built from the origin of the URL the user pasted; to recognise
// a future domain just add a substring to HOSTS.
//
// The story page only ships an empty <div class="volume-list"> — the chapter
// list is loaded by client JS from GET /book/index, authenticated with a
// per-page-load key inlined in the story page script:
//
//   var bookId = "…"; var signKey = "…";
//   function fuzzySign(text) { return text.substring(N) + text.substring(0, N); }
//   loadBookIndex(0, SIZE, false);
//   sign = sha256(fuzzySign(signKey + start + size))
//
// N (the rotation) and signKey differ on every page load, so both are parsed
// from the HTML at import time. One signKey stays valid for all TOC pages.
//
// The site is public and quite slow: every request to its host is spaced at
// least DELAY_MS apart (see throttleHost), covers and images included.

const HOSTS = ['wikidich', 'wikicv']
const DELAY_MS = 500
const TOC_PAGE_CAP = 100 // safety stop: 100 pages ≈ 50k chapters

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

function absolutize(href, base) {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

function politeFetch(url) {
  throttleHost(url, DELAY_MS)
  return fetchText(url)
}

/**
 * Chapter pages also inline bookId/signKey/fuzzySign, but their signKey is not
 * valid for /book/index (the server scopes keys to the page that minted them),
 * so signing the TOC request with it gets a 404. Only the story page calls
 * loadBookIndex(...) — when that call is missing we are on a chapter page, and
 * its single "Mục lục" link (the one /truyen/<slug> href with no chapter
 * segment) points back at the story page.
 */
function findStoryUrl(html, baseUrl) {
  const $ = cheerio.load(html)
  const href = $('a[href*="/truyen/"]')
    .toArray()
    .map((el) => $(el).attr('href') || '')
    .find((h) => /^(?:https?:\/\/[^/]+)?\/truyen\/[^/]+\/?$/.test(h))
  return href ? absolutize(href, baseUrl) : null
}

/** Pull bookId, signKey, fuzzySign rotation and TOC page size out of the page script. */
function parseSignParams(html) {
  const bookId = html.match(/var\s+bookId\s*=\s*["']([0-9a-f]+)["']/i)?.[1]
  const signKey = html.match(/var\s+signKey\s*=\s*["']([0-9a-f]+)["']/i)?.[1]
  const rotation = html.match(/fuzzySign\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+\1\.substring\(\s*(\d+)\s*\)/)?.[2]
  const size = html.match(/loadBookIndex\(\s*\d+\s*,\s*(\d+)/)?.[1]
  return {
    bookId,
    signKey,
    rotation: rotation == null ? null : Number(rotation),
    size: size ? Number(size) : 501
  }
}

function tocPageUrl(origin, { bookId, signKey, rotation, size }, start) {
  const seed = signKey + start + size
  const sign = sha256(seed.substring(rotation) + seed.substring(0, rotation))
  const u = new URL('/book/index', origin)
  u.search = new URLSearchParams({ bookId, start, size, signKey, sign })
  return u.toString()
}

export const wikidichAdapter = {
  id: 'wikidich',
  name: 'WikiDich',

  matches(url) {
    try {
      const host = new URL(url).host
      return HOSTS.some((h) => host.includes(h))
    } catch {
      return false
    }
  },

  async fetchMeta(url) {
    let pageUrl = url
    let html = await politeFetch(pageUrl)
    if (!html.includes('loadBookIndex(')) {
      // A chapter URL was pasted — hop to the story page it belongs to.
      const storyUrl = findStoryUrl(html, pageUrl)
      if (!storyUrl) {
        throw new Error('Could not find the story page for this URL — paste the story page URL')
      }
      pageUrl = storyUrl
      html = await politeFetch(pageUrl)
    }
    const $ = cheerio.load(html)
    const title = $('.book-info h2').first().text().trim() || $('title').first().text().trim() || 'Imported'
    const author = $('.book-info a[href*="/tac-gia/"]').first().text().trim()
    const cover = absolutize($('.book-info .cover-wrapper img').first().attr('src'), pageUrl)

    const params = parseSignParams(html)
    if (!params.bookId || !params.signKey || params.rotation == null) {
      throw new Error('Could not read the chapter list from ' + pageUrl)
    }

    const origin = new URL(pageUrl).origin
    const chapters = []
    const seen = new Set()
    for (let page = 0; page < TOC_PAGE_CAP; page++) {
      const $$ = cheerio.load(await politeFetch(tocPageUrl(origin, params, page * params.size)))
      const links = $$('li.chapter-name a').toArray()
      for (const el of links) {
        const chapterUrl = absolutize($$(el).attr('href'), pageUrl)
        if (chapterUrl && !seen.has(chapterUrl)) {
          seen.add(chapterUrl)
          chapters.push({ title: $$(el).text().trim(), url: chapterUrl })
        }
      }
      if (links.length < params.size) break
    }
    return { title, author, cover, chapters }
  },

  async fetchChapter(url) {
    const $ = cheerio.load(await politeFetch(url))
    // #bookContent holds three p.book-title: book title, chapter title, author.
    const title = $('#bookContent p.book-title').eq(1).text().trim()
    const body = $('#bookContentBody')
    body.find('script, ins, iframe').remove()
    return { title, html: body.html() || '' }
  }
}
