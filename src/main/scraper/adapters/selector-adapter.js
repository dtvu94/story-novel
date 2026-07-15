import * as cheerio from 'cheerio'
import { fetchText } from '../fetch.js'

function absolutize(href, base) {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/**
 * Build a site adapter from CSS selectors. Adding support for a new site is
 * just one config object — no new code paths.
 *
 * @param {{
 *   id:string, name:string, hosts:string[],
 *   titleSel:string, authorSel?:string, coverSel?:string,
 *   chapterLinkSel:string, chapterTitleSel?:string, chapterContentSel:string
 * }} cfg
 */
export function createSelectorAdapter(cfg) {
  return {
    id: cfg.id,
    name: cfg.name,
    matches: (url) => cfg.hosts.some((h) => url.includes(h)),

    async fetchMeta(url) {
      const $ = cheerio.load(await fetchText(url))
      const title = $(cfg.titleSel).first().text().trim() || 'Imported'
      const author = cfg.authorSel ? $(cfg.authorSel).first().text().trim() : ''
      const cover = cfg.coverSel ? absolutize($(cfg.coverSel).first().attr('src'), url) : null
      const chapters = $(cfg.chapterLinkSel)
        .toArray()
        .map((el) => ({ title: $(el).text().trim(), url: absolutize($(el).attr('href'), url) }))
        .filter((c) => c.url)
      return { title, author, cover, chapters }
    },

    async fetchChapter(url) {
      const $ = cheerio.load(await fetchText(url))
      const title = cfg.chapterTitleSel ? $(cfg.chapterTitleSel).first().text().trim() : ''
      const html = $(cfg.chapterContentSel).first().html() || ''
      return { title, html }
    }
  }
}
