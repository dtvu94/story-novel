import { coverUrl } from '../lib/cover'
import { formatCount } from '../lib/format'
import Icon from './Icon'

export function BookCard({ entry, onOpen, onEdit, onDelete }) {
  const cover = coverUrl(entry.id, entry.cover)
  return (
    <div className="book-card" onClick={() => onOpen(entry)}>
      <div className="book-cover">
        {cover ? (
          <img src={cover} alt={entry.title} />
        ) : (
          <div className="placeholder-title">{entry.title}</div>
        )}
        <div className="card-badges">
          <span className="badge">{entry.chapterCount} ch</span>
          {entry.source?.type === 'import-web' && <span className="badge">web</span>}
        </div>
        <div className="card-actions">
          {onEdit && (
            <button
              className="card-action"
              title="Edit in Studio"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(entry)
              }}
            >
              <Icon name="edit" size={15} />
            </button>
          )}
          {onDelete && (
            <button
              className="card-action danger"
              title="Delete book"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(entry)
              }}
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="meta">
        <div className="title">{entry.title}</div>
        <div className="sub">
          {entry.author || 'Unknown'} · {formatCount(entry.wordCount)} words
        </div>
      </div>
    </div>
  )
}

export function BookRow({ entry, onOpen, onEdit, onDelete }) {
  const cover = coverUrl(entry.id, entry.cover)
  return (
    <div className="book-row" onClick={() => onOpen(entry)}>
      {cover ? (
        <img className="row-cover" src={cover} alt="" />
      ) : (
        <div className="row-cover" />
      )}
      <div className="row-main">
        <div className="title">{entry.title}</div>
        <div className="sub">
          {entry.author || 'Unknown'} · {entry.chapterCount} chapters · {formatCount(entry.wordCount)} words
        </div>
      </div>
      <div className="row-tags">
        {(entry.tags || []).slice(0, 4).map((t) => (
          <span className="tag-pill" key={t}>
            {t}
          </span>
        ))}
      </div>
      {onEdit && (
        <button
          className="icon-btn"
          title="Edit in Studio"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(entry)
          }}
        >
          <Icon name="edit" size={16} />
        </button>
      )}
      {onDelete && (
        <button
          className="icon-btn"
          title="Delete book"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(entry)
          }}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  )
}
