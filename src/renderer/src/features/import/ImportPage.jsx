import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useLibrary } from '../../store/useLibrary'
import { splitIntoChapters } from '@shared/parse-text'
import Icon from '../../components/Icon'
import WebImport from './WebImport'
import './import.css'

function Results({ results }) {
  if (!results?.length) return null
  return (
    <div className="import-results">
      {results.map((r, i) => (
        <div className="res" key={i}>
          <span className={`dot ${r.ok ? 'ok' : 'err'}`} />
          {r.ok ? (
            <span>Imported <strong>{r.title}</strong> · {r.chapters} chapters</span>
          ) : (
            <span className="muted">Failed: {r.file} — {r.error}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ImportPage() {
  const navigate = useNavigate()
  const load = useLibrary((s) => s.load)
  const [tab, setTab] = useState('files')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)

  const [pTitle, setPTitle] = useState('')
  const [pAuthor, setPAuthor] = useState('')
  const [pText, setPText] = useState('')

  const importFiles = async () => {
    const paths = await api.dialog.openFiles({
      filters: [{ name: 'Books', extensions: ['txt', 'md', 'markdown', 'epub'] }]
    })
    if (!paths.length) return
    setBusy(true)
    setResults(null)
    try {
      const res = await api.import.files(paths)
      setResults(res)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const importFolder = async () => {
    setBusy(true)
    setResults(null)
    try {
      const res = await api.book.importFile()
      if (res.length) {
        setResults(res)
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  const createFromPaste = async () => {
    const title = pTitle.trim() || 'Pasted book'
    const chapters = splitIntoChapters(pText, title)
    const book = await api.book.create({
      title,
      author: pAuthor.trim(),
      chapters,
      source: { type: 'paste' }
    })
    await load()
    navigate(`/studio/${book.id}`)
  }

  const loadSamples = async () => {
    setBusy(true)
    try {
      await api.library.seedSamples()
      await load()
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate('/')}>
          <Icon name="chevronLeft" />
        </button>
        <h1>Import</h1>
      </div>

      <div className="import-tabs">
        <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>From files</button>
        <button className={tab === 'paste' ? 'active' : ''} onClick={() => setTab('paste')}>Paste text</button>
        <button className={tab === 'web' ? 'active' : ''} onClick={() => setTab('web')}>From the web</button>
        <button className={tab === 'folder' ? 'active' : ''} onClick={() => setTab('folder')}>Book folder</button>
        <button className={tab === 'samples' ? 'active' : ''} onClick={() => setTab('samples')}>Samples</button>
      </div>

      {tab === 'files' && (
        <div className="drop-card">
          <div className="big">📄</div>
          <h2 style={{ margin: 0 }}>Import .txt, .md or .epub</h2>
          <p>Text files are split into chapters by headings. EPUBs keep chapters, cover and images.</p>
          <button className="btn primary" disabled={busy} onClick={importFiles}>
            <Icon name="import" size={16} /> {busy ? 'Importing…' : 'Choose files'}
          </button>
          <Results results={results} />
        </div>
      )}

      {tab === 'paste' && (
        <div style={{ maxWidth: 720 }}>
          <div className="field">
            <label>Title</label>
            <input className="input" value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Book title" />
          </div>
          <div className="field">
            <label>Author</label>
            <input className="input" value={pAuthor} onChange={(e) => setPAuthor(e.target.value)} placeholder="Author (optional)" />
          </div>
          <div className="field">
            <label>Text — use "# Heading" or "Chapter N" lines to split chapters</label>
            <textarea
              className="textarea"
              style={{ minHeight: 260 }}
              value={pText}
              onChange={(e) => setPText(e.target.value)}
              placeholder={'# Chapter 1\nOnce upon a time…\n\n# Chapter 2\n…'}
            />
          </div>
          <button className="btn primary" disabled={!pText.trim()} onClick={createFromPaste}>
            <Icon name="plus" size={16} /> Create book
          </button>
        </div>
      )}

      {tab === 'web' && <WebImport onDone={load} />}

      {tab === 'folder' && (
        <div className="drop-card">
          <div className="big">📁</div>
          <h2 style={{ margin: 0 }}>Open a book folder</h2>
          <p>
            Pick a book folder exported from Story Shelf (contains <code>book.json</code> + assets).
            This is how you move a book between PCs.
          </p>
          <button className="btn primary" disabled={busy} onClick={importFolder}>
            <Icon name="import" size={16} /> {busy ? 'Importing…' : 'Choose folder(s)'}
          </button>
          <Results results={results} />
        </div>
      )}

      {tab === 'samples' && (
        <div className="drop-card">
          <div className="big">📚</div>
          <h2 style={{ margin: 0 }}>Add sample books</h2>
          <p>Public-domain classics (Austen, Carroll, Doyle, Aesop) to explore the reader and editor.</p>
          <button className="btn primary" disabled={busy} onClick={loadSamples}>
            <Icon name="plus" size={16} /> {busy ? 'Adding…' : 'Add samples'}
          </button>
          <div className="sample-note">Includes chapters, markdown formatting and footnote annotations.</div>
        </div>
      )}
    </div>
  )
}
