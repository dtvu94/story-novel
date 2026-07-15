import { useRef, useState } from 'react'
import Modal from '../../components/Modal'
import TagInput from '../../components/TagInput'
import { coverUrl } from '../../lib/cover'
import { readImageFile } from '../../lib/image'
import { api } from '../../lib/api'

export default function BookDetailsModal({ book, onClose, onSave }) {
  const [draft, setDraft] = useState({
    title: book.title,
    author: book.author,
    description: book.description,
    tags: book.tags || [],
    cover: book.cover
  })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const onPickCover = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const { data, ext } = await readImageFile(file)
      const rel = await api.assets.save(book.id, data, ext, 'cover')
      set({ cover: rel })
    } finally {
      setBusy(false)
    }
  }

  // Cache-bust so the <img> refreshes after a cover is overwritten.
  const cover = draft.cover ? `${coverUrl(book.id, draft.cover)}?t=${Date.now()}` : null

  return (
    <Modal
      title="Book details"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(draft)}>Save details</button>
        </>
      }
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          {cover ? (
            <img className="cover-preview" src={cover} alt="cover" />
          ) : (
            <div className="cover-preview" />
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickCover} />
          <button
            className="btn sm"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? 'Saving…' : 'Choose cover'}
          </button>
          {draft.cover && (
            <button className="btn sm ghost" style={{ marginTop: 4 }} onClick={() => set({ cover: null })}>
              Remove
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div className="field">
            <label>Title</label>
            <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="field">
            <label>Author</label>
            <input className="input" value={draft.author} onChange={(e) => set({ author: e.target.value })} />
          </div>
          <div className="field">
            <label>Tags</label>
            <TagInput value={draft.tags} onChange={(tags) => set({ tags })} />
          </div>
        </div>
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          className="textarea"
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="A short synopsis…"
        />
      </div>
    </Modal>
  )
}
