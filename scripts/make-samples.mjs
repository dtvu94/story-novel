// Generate importable sample books from src/main/samples.js into ./samples/,
// in several formats so every import path can be tried:
//   - markdown/*.md      -> Import ▸ From files  (chapters split on "# Heading")
//   - text/*.txt         -> Import ▸ From files  (chapters split on "Chapter N")
//   - book-folder/*/     -> Import ▸ Book folder (portable, with an assets/ cover)
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SAMPLE_BOOKS } from '../src/main/samples.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples')

const slug = (s) =>
  s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// A tiny self-contained SVG cover so the book-folder sample demonstrates assets.
function coverSvg(book) {
  const title = book.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const author = (book.author || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7c9cf5"/><stop offset="1" stop-color="#b98cf0"/>
  </linearGradient></defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <foreignObject x="30" y="60" width="340" height="480">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Georgia,serif;color:#12142a;">
      <div style="font-size:34px;font-weight:700;line-height:1.2;">${title}</div>
      <div style="font-size:18px;margin-top:16px;opacity:.8;">${author}</div>
    </div>
  </foreignObject>
</svg>`
}

function toMarkdownDoc(book) {
  // Start directly with the first "# Heading" so no stray preface chapter is created.
  return book.chapters.map((c) => `# ${c.title}\n\n${c.markdown}`).join('\n\n') + '\n'
}

function toPlainText(book) {
  // Chapter titles like "Chapter 1" are detected as headings by the importer.
  return book.chapters.map((c) => `${c.title}\n\n${c.markdown}`).join('\n\n\n')
}

async function main() {
  await rm(root, { recursive: true, force: true })
  await mkdir(join(root, 'markdown'), { recursive: true })
  await mkdir(join(root, 'text'), { recursive: true })
  await mkdir(join(root, 'book-folder'), { recursive: true })

  for (const book of SAMPLE_BOOKS) {
    const s = slug(book.title)
    const isText = /pride|aesop/i.test(book.title) // give a couple the .txt treatment
    if (isText) {
      await writeFile(join(root, 'text', `${s}.txt`), toPlainText(book), 'utf8')
    } else {
      await writeFile(join(root, 'markdown', `${s}.md`), toMarkdownDoc(book), 'utf8')
    }

    // Every book also as a portable book folder (with an SVG cover asset).
    const dir = join(root, 'book-folder', s)
    await mkdir(join(dir, 'assets'), { recursive: true })
    await writeFile(join(dir, 'assets', 'cover.svg'), coverSvg(book), 'utf8')
    const bookJson = {
      _format: 'story-shelf-book@1',
      title: book.title,
      author: book.author,
      description: book.description,
      tags: book.tags,
      cover: 'assets/cover.svg',
      source: { type: 'sample' },
      chapters: book.chapters.map((c, i) => ({ title: c.title, order: i, markdown: c.markdown }))
    }
    await writeFile(join(dir, 'book.json'), JSON.stringify(bookJson, null, 2), 'utf8')
  }

  console.log(`Wrote ${SAMPLE_BOOKS.length} sample books to ${root}`)
}

main()
