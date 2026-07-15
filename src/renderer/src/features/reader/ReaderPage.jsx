import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { resolveReaderColors } from '@shared/reader-themes'
import { useSettings } from '../../store/useSettings'
import MarkdownView from '../../components/MarkdownView'
import Icon from '../../components/Icon'
import ReaderSettings from './ReaderSettings'
import './reader.css'

export default function ReaderPage() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const reader = useSettings((s) => s.settings.reader)

  const [book, setBook] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [panel, setPanel] = useState(null) // 'settings' | 'chapters' | 'bookmarks'
  const [ratio, setRatio] = useState(0)

  const scrollRef = useRef(null)
  const pendingScroll = useRef(0)
  const saveTimer = useRef(null)

  // Load book + reading state.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const [b, st] = await Promise.all([api.book.get(bookId), api.state.get()])
      if (cancelled || !b) return setBook(b || false)
      const entry = st.books?.[bookId] || {}
      setBookmarks(entry.bookmarks || [])
      const initial = chapterId || entry.lastChapterId || b.chapters[0]?.id || null
      pendingScroll.current = !chapterId && initial === entry.lastChapterId ? entry.scrollRatio || 0 : 0
      setBook(b)
      setActiveId(initial)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [bookId, chapterId])

  const chapters = book ? book.chapters : []
  const index = useMemo(() => chapters.findIndex((c) => c.id === activeId), [chapters, activeId])
  const active = chapters[index] || null

  // Restore/reset scroll when the chapter changes (after layout).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !active) return
    const max = el.scrollHeight - el.clientHeight
    el.scrollTop = max > 0 ? pendingScroll.current * max : 0
    setRatio(pendingScroll.current)
    pendingScroll.current = 0
  }, [activeId, active])

  const saveProgress = useCallback(
    (r) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        api.state.setProgress(bookId, { lastChapterId: activeId, scrollRatio: r })
      }, 400)
    },
    [bookId, activeId]
  )

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const r = max > 0 ? el.scrollTop / max : 0
    setRatio(r)
    saveProgress(r)
  }

  const goto = useCallback(
    (id, scroll = 0) => {
      if (!id) return
      pendingScroll.current = scroll
      setActiveId(id)
      api.state.setProgress(bookId, { lastChapterId: id, scrollRatio: scroll })
    },
    [bookId]
  )

  const prev = () => index > 0 && goto(chapters[index - 1].id)
  const next = () => index < chapters.length - 1 && goto(chapters[index + 1].id)

  // Keyboard: arrows change chapter, Esc exits.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleBookmark = async () => {
    const entry = await api.state.toggleBookmark(bookId, {
      chapterId: activeId,
      scrollRatio: ratio,
      label: active?.title || ''
    })
    setBookmarks(entry.bookmarks || [])
  }

  const isBookmarked = bookmarks.some(
    (b) => b.chapterId === activeId && Math.abs((b.scrollRatio || 0) - ratio) < 0.05
  )

  if (book === false) {
    return (
      <div className="reader">
        <div className="editor-empty" style={{ color: 'var(--fg)' }}>
          <p>This book could not be found.</p>
          <button className="btn" onClick={() => navigate('/')}>Back to library</button>
        </div>
      </div>
    )
  }
  if (!book) return <div className="spinner" />

  const colors = resolveReaderColors(reader)
  const rootStyle = {
    '--r-bg': colors.bg,
    '--r-fg': colors.fg,
    '--r-font': reader.fontFamily,
    '--r-size': `${reader.fontSize}px`,
    '--r-lh': reader.lineHeight,
    '--r-ls': `${reader.letterSpacing}px`,
    '--r-maxw': `${reader.maxWidth}px`
  }
  const contentStyle = {
    maxWidth: reader.maxWidth,
    paddingLeft: reader.margin,
    paddingRight: reader.margin
  }
  const overall = chapters.length ? ((index + ratio) / chapters.length) * 100 : 0

  return (
    <div className="reader" style={rootStyle}>
      <div className="reader-bar">
        <button className="r-icon" onClick={() => navigate('/')} title="Back (Esc)">
          <Icon name="chevronLeft" />
        </button>
        <div className="r-title">
          <div className="bt">{book.title}</div>
          <div className="ct">{active ? active.title : 'No chapters'}</div>
        </div>
        <button className={`r-icon${isBookmarked ? ' on' : ''}`} onClick={toggleBookmark} title="Bookmark">
          <Icon name="bookmark" />
        </button>
        <button className="r-icon" onClick={() => setPanel('bookmarks')} title="Bookmarks">
          <Icon name="list" />
        </button>
        <button className="r-icon" onClick={() => setPanel('chapters')} title="Chapters">
          <Icon name="book" />
        </button>
        <button className="r-icon" onClick={() => setPanel('settings')} title="Reading settings">
          <Icon name="aA" />
        </button>
      </div>

      <div className="reader-scroll" ref={scrollRef} onScroll={onScroll}>
        {active ? (
          <>
            <article className="reader-content" style={contentStyle}>
              <h1 className="chapter-heading">{active.title}</h1>
              <MarkdownView bookId={book.id}>{active.markdown}</MarkdownView>
            </article>
            <div className="reader-nav">
              <button onClick={prev} disabled={index <= 0}>
                ← {index > 0 ? chapters[index - 1].title : 'Start'}
              </button>
              <button onClick={next} disabled={index >= chapters.length - 1}>
                {index < chapters.length - 1 ? chapters[index + 1].title : 'End'} →
              </button>
            </div>
          </>
        ) : (
          <div className="editor-empty" style={{ color: 'var(--r-fg)' }}>
            <p>This book has no chapters yet.</p>
            <button className="btn" onClick={() => navigate(`/studio/${book.id}`)}>Open in Studio</button>
          </div>
        )}
      </div>

      <div className="reader-progress"><span style={{ width: `${overall}%` }} /></div>

      {panel === 'settings' && <ReaderSettings onClose={() => setPanel(null)} />}

      {panel === 'chapters' && (
        <>
          <div className="drawer-backdrop" onClick={() => setPanel(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <h3>Chapters</h3>
              <button className="icon-btn" onClick={() => setPanel(null)}><Icon name="close" /></button>
            </div>
            <div className="drawer-body">
              {chapters.map((c, i) => (
                <div
                  key={c.id}
                  className={`chapter-drawer-item${c.id === activeId ? ' active' : ''}`}
                  onClick={() => { goto(c.id); setPanel(null) }}
                >
                  <span className="num">{i + 1}</span>
                  <span>{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {panel === 'bookmarks' && (
        <>
          <div className="drawer-backdrop" onClick={() => setPanel(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <h3>Bookmarks</h3>
              <button className="icon-btn" onClick={() => setPanel(null)}><Icon name="close" /></button>
            </div>
            <div className="drawer-body">
              {bookmarks.length === 0 && <p className="muted">No bookmarks yet. Tap the bookmark icon while reading.</p>}
              {bookmarks.map((b, i) => {
                const ch = chapters.find((c) => c.id === b.chapterId)
                return (
                  <div
                    key={i}
                    className="bookmark-item"
                    onClick={() => { goto(b.chapterId, b.scrollRatio || 0); setPanel(null) }}
                  >
                    <div style={{ fontWeight: 600 }}>{ch?.title || b.label || 'Chapter'}</div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {Math.round((b.scrollRatio || 0) * 100)}% through chapter
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
