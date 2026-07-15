import { useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

export default function WebImport({ onDone }) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const doPreview = async () => {
    if (!url.trim()) return
    setBusy(true)
    setError('')
    setResult(null)
    setPreview(null)
    try {
      const p = await api.import.urlPreview(url.trim())
      setPreview(p)
      const sel = {}
      p.chapters.forEach((c) => (sel[c.url] = true))
      setSelected(sel)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const setAll = (v) => {
    const s = {}
    preview.chapters.forEach((c) => (s[c.url] = v))
    setSelected(s)
  }

  const chosen = preview ? preview.chapters.filter((c) => selected[c.url]) : []

  const doImport = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.import.urlChapters({
        url: preview.url,
        title: preview.title,
        author: preview.author,
        cover: preview.cover,
        chapters: chosen
      })
      setResult(res)
      onDone?.()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          placeholder="Paste a chapter or table-of-contents URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doPreview()}
        />
        <button className="btn primary" disabled={busy || !url.trim()} onClick={doPreview}>
          <Icon name="globe" size={16} /> {busy && !preview ? 'Loading…' : 'Preview'}
        </button>
      </div>
      <p className="sample-note">
        Unknown sites are read as a single article. Known sites (configured adapters) can list a
        whole table of contents. Only import content you have the right to save for personal use.
      </p>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {preview && !result && (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>{preview.title}</strong>
            {preview.author ? ` · ${preview.author}` : ''}{' '}
            <span className="muted">({preview.adapterName})</span>
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="muted">{chosen.length} of {preview.chapters.length} chapters selected</span>
            <div style={{ flex: 1 }} />
            <button className="btn sm" onClick={() => setAll(true)}>All</button>
            <button className="btn sm" onClick={() => setAll(false)}>None</button>
          </div>
          <div
            style={{
              maxHeight: 320,
              overflow: 'auto',
              border: '1px solid var(--border-soft)',
              borderRadius: 8,
              padding: 6,
              marginBottom: 14
            }}
          >
            {preview.chapters.map((c) => (
              <label
                key={c.url}
                style={{ display: 'flex', gap: 8, padding: '6px 8px', cursor: 'pointer', alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={!!selected[c.url]}
                  onChange={() => setSelected((s) => ({ ...s, [c.url]: !s[c.url] }))}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title || c.url}
                </span>
              </label>
            ))}
          </div>
          <button className="btn primary" disabled={busy || chosen.length === 0} onClick={doImport}>
            <Icon name="import" size={16} /> {busy ? 'Importing…' : `Import ${chosen.length} chapter(s)`}
          </button>
        </div>
      )}

      {result?.ok && (
        <div className="import-results" style={{ marginTop: 16 }}>
          <div className="res">
            <span className="dot ok" />
            <span>Imported <strong>{result.title}</strong> · {result.chapters} chapters</span>
          </div>
        </div>
      )}
    </div>
  )
}
