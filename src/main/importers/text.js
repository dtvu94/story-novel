import fs from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { splitIntoChapters } from '../../shared/parse-text.js'

/**
 * Import a .txt or .md file into a book payload.
 * @returns {Promise<{book:{title:string,chapters:Array},cover:null}>}
 */
export async function importTextFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const title = basename(filePath, extname(filePath))
  const chapters = splitIntoChapters(raw, title)
  return { book: { title, chapters }, cover: null }
}
