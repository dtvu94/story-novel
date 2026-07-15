import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import remarkGfm from 'remark-gfm'
import { api } from '../../lib/api'
import { newChapter } from '@shared/model'
import { readImageFile } from '../../lib/image'
import { assetUrl } from '../../lib/cover'
import Icon from '../../components/Icon'
import BookDetailsModal from './BookDetailsModal'
import './studio.css'

function resolveEditorImg(bookId, src) {
  return /^(https?:|data:|asset:|blob:)/i.test(src || '') ? src : assetUrl(bookId, src) || src
}

export default function StudioPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | saving | dirty
  const [details, setDetails] = useState(false)
  const [toast, setToast] = useState('')

  const skipSave = useRef(true)
  const timer = useRef(null)
  const imgInput = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Load existing book, or create a fresh one for /studio/new.
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (bookId === 'new') {
        const b = await api.book.create({
          title: 'Untitled',
          chapters: [{ title: 'Chapter 1', markdown: '' }]
        })
        if (!cancelled) navigate(`/studio/${b.id}`, { replace: true })
        return
      }
      const b = await api.book.get(bookId)
      if (cancelled) return
      skipSave.current = true
      setBook(b)
      setActiveId(b?.chapters?.[0]?.id ?? null)
      setSaveState('saved')
    }
    init()
    return () => {
      cancelled = true
    }
  }, [bookId, navigate])

  const persist = useCallback(async (b) => {
    setSaveState('saving')
    await api.book.save(b)
    setSaveState('saved')
  }, [])

  // Debounced autosave on any edit (skips the initial load).
  useEffect(() => {
    if (!book) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    setSaveState('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(book), 700)
    return () => clearTimeout(timer.current)
  }, [book, persist])

  // Ctrl/Cmd+S to save now.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        clearTimeout(timer.current)
        if (book) persist(book)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [book, persist])

  const active = useMemo(
    () => book?.chapters.find((c) => c.id === activeId) || null,
    [book, activeId]
  )

  const patchBook = (patch) => setBook((b) => ({ ...b, ...patch }))

  const patchActive = (patch) =>
    setBook((b) => ({
      ...b,
      chapters: b.chapters.map((c) =>
        c.id === activeId ? { ...c, ...patch, updatedAt: Date.now() } : c
      )
    }))

  const addChapter = () => {
    const ch = newChapter({ title: `Chapter ${book.chapters.length + 1}`, order: book.chapters.length })
    setBook((b) => ({ ...b, chapters: [...b.chapters, ch] }))
    setActiveId(ch.id)
  }

  const deleteChapter = (id) => {
    setBook((b) => {
      const idx = b.chapters.findIndex((c) => c.id === id)
      const chapters = b.chapters.filter((c) => c.id !== id)
      if (id === activeId) {
        const next = chapters[idx] || chapters[idx - 1] || null
        setActiveId(next?.id ?? null)
      }
      return { ...b, chapters }
    })
  }

  const moveChapter = (id, dir) => {
    setBook((b) => {
      const chapters = [...b.chapters]
      const i = chapters.findIndex((c) => c.id === id)
      const j = i + dir
      if (j < 0 || j >= chapters.length) return b
      ;[chapters[i], chapters[j]] = [chapters[j], chapters[i]]
      return { ...b, chapters: chapters.map((c, k) => ({ ...c, order: k })) }
    })
  }

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !active) return
    const { data, ext } = await readImageFile(file)
    const rel = await api.assets.save(book.id, data, ext)
    patchActive({ markdown: `${(active.markdown || '').trimEnd()}\n\n![image](${rel})\n\n` })
    e.target.value = ''
    showToast('Image added to the end of the chapter')
  }

  const insertAnnotation = () => {
    if (!active) return
    const n = ((active.markdown || '').match(/\[\^/g) || []).length + 1
    const key = `note${n}`
    patchActive({
      markdown: `${(active.markdown || '').trimEnd()}[^${key}]\n\n[^${key}]: Your annotation here.\n`
    })
    showToast('Annotation (footnote) added — edit its text and marker position')
  }

  const onExport = async () => {
    const dest = await api.book.export(book.id)
    if (dest) showToast(`Exported to ${dest}`)
  }

  const onDelete = async () => {
    if (!window.confirm(`Delete "${book.title}" and all its chapters? This cannot be undone.`)) return
    clearTimeout(timer.current)
    skipSave.current = true
    await api.book.delete(book.id)
    navigate('/')
  }

  if (!book) return <div className="spinner" />

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved' : 'Saved'

  return (
    <div className="studio">
      <div className="studio-top">
        <button className="icon-btn" onClick={() => navigate('/')} title="Back to library">
          <Icon name="chevronLeft" />
        </button>
        <input
          className="book-title-input"
          value={book.title}
          placeholder="Book title"
          onChange={(e) => patchBook({ title: e.target.value })}
        />
        <span className="save-state">{saveLabel}</span>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={() => setDetails(true)}>
          <Icon name="edit" size={16} /> Details
        </button>
        <button className="btn ghost" onClick={onExport} title="Export this book as a portable folder">
          <Icon name="upload" size={16} /> Export
        </button>
        <button className="btn danger" onClick={onDelete} title="Delete book">
          <Icon name="trash" size={16} />
        </button>
        <button className="btn" onClick={() => navigate(`/read/${book.id}`)}>
          <Icon name="eye" size={16} /> Read
        </button>
      </div>

      <div className="studio-body">
        <div className="chapter-list">
          <div className="list-head">
            <span>Chapters</span>
            <button className="icon-btn" onClick={addChapter} title="Add chapter">
              <Icon name="plus" size={16} />
            </button>
          </div>
          {book.chapters.map((c, i) => (
            <div
              key={c.id}
              className={`chapter-item${c.id === activeId ? ' active' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="num">{i + 1}</span>
              <span className="ch-title">{c.title || 'Untitled'}</span>
              <span className="ch-actions">
                <button onClick={(e) => { e.stopPropagation(); moveChapter(c.id, -1) }} title="Move up">
                  <Icon name="chevronDown" size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveChapter(c.id, 1) }} title="Move down">
                  <Icon name="chevronDown" size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteChapter(c.id) }} title="Delete">
                  <Icon name="trash" size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="editor-pane">
          {active ? (
            <>
              <input
                className="ch-title-input"
                value={active.title}
                placeholder="Chapter title"
                onChange={(e) => patchActive({ title: e.target.value })}
              />
              <div className="editor-toolbar">
                <button className="btn sm" onClick={() => imgInput.current?.click()}>
                  <Icon name="import" size={14} /> Image
                </button>
                <button className="btn sm" onClick={insertAnnotation}>
                  <Icon name="plus" size={14} /> Annotation
                </button>
                <input ref={imgInput} type="file" accept="image/*" hidden onChange={onPickImage} />
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  Inserted at the chapter end — drag them where you want.
                </span>
              </div>
              <div className="md-wrap" data-color-mode="dark">
                <MDEditor
                  value={active.markdown}
                  onChange={(v) => patchActive({ markdown: v ?? '' })}
                  preview="live"
                  visibleDragbar={false}
                  height="100%"
                  previewOptions={{
                    remarkPlugins: [remarkGfm],
                    components: {
                      img: ({ node, ...p }) => (
                        <img {...p} src={resolveEditorImg(book.id, p.src)} alt={p.alt || ''} />
                      )
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="editor-empty">
              <p>No chapters yet.</p>
              <button className="btn primary" onClick={addChapter}>
                <Icon name="plus" size={16} /> Add chapter
              </button>
            </div>
          )}
        </div>
      </div>

      {details && (
        <BookDetailsModal
          book={book}
          onClose={() => setDetails(false)}
          onSave={(patch) => {
            patchBook(patch)
            setDetails(false)
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
