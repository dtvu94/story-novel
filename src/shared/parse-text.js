// Split a plain-text or markdown document into chapters.
// Heuristics (in priority order):
//   1. Markdown ATX headings (#, ##, ###)
//   2. "Chapter N" / "Chương N" / "Part N" style heading lines
//   3. Fallback: a single chapter containing the whole document.

const MD_HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/
const NAMED_HEADING =
  /^\s{0,4}((chapter|chapters|chuong|chương|chap|phần|phan|part|episode|tập|tap|volume|book)\b[^\n]{0,70})$/i

function cleanTitle(raw) {
  return raw.replace(/^#{1,6}\s*/, '').replace(/\*+/g, '').trim() || 'Untitled'
}

export function splitIntoChapters(rawText, fallbackTitle = 'Chapter 1') {
  const text = String(rawText || '').replace(/\r\n?/g, '\n')
  const lines = text.split('\n')

  // Locate heading lines.
  const heads = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const md = line.match(MD_HEADING)
    if (md) {
      heads.push({ line: i, title: cleanTitle(md[2]) })
      continue
    }
    const named = line.match(NAMED_HEADING)
    // Named headings must be short standalone lines (not sentences).
    if (named && line.trim().length <= 74) {
      heads.push({ line: i, title: line.trim() })
    }
  }

  if (heads.length === 0) {
    const body = text.trim()
    return [{ title: fallbackTitle, markdown: body }]
  }

  const chapters = []

  // Preamble before the first heading (a prologue / description).
  const preamble = lines.slice(0, heads[0].line).join('\n').trim()
  if (preamble) chapters.push({ title: 'Preface', markdown: preamble })

  for (let h = 0; h < heads.length; h++) {
    const start = heads[h].line + 1
    const end = h + 1 < heads.length ? heads[h + 1].line : lines.length
    const body = lines.slice(start, end).join('\n').trim()
    chapters.push({ title: heads[h].title, markdown: body })
  }

  // Drop empty leading/trailing chapters that carry no text and no distinct title.
  return chapters.filter((c) => c.markdown || c.title)
}
