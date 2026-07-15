import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../../store/useLibrary'
import { filterEntries, collectTags } from '../../lib/search'
import { BookCard, BookRow } from '../../components/BookCard'
import Icon from '../../components/Icon'

export default function LibraryPage() {
  const navigate = useNavigate()
  const {
    entries, loading, load,
    query, setQuery, activeTags, toggleTag,
    sort, setSort, view, setView, clearFilters
  } = useLibrary()

  useEffect(() => {
    load()
  }, [load])

  const tags = useMemo(() => collectTags(entries), [entries])
  const visible = useMemo(
    () => filterEntries(entries, { query, tags: activeTags, sort }),
    [entries, query, activeTags, sort]
  )

  const open = (entry) => navigate(`/read/${entry.id}`)
  const edit = (entry) => navigate(`/studio/${entry.id}`)
  const hasFilters = query || activeTags.length

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library</h1>
        <span className="muted">{entries.length} {entries.length === 1 ? 'book' : 'books'}</span>
        <div className="spacer" />
        <button className="btn" onClick={() => navigate('/import')}>
          <Icon name="import" size={16} /> Import
        </button>
        <button className="btn primary" onClick={() => navigate('/studio/new')}>
          <Icon name="plus" size={16} /> New book
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search-icon"><Icon name="search" size={16} /></span>
          <input
            className="input"
            placeholder="Search title, author, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 160 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="updated">Recently updated</option>
          <option value="created">Recently added</option>
          <option value="title">Title A–Z</option>
          <option value="author">Author A–Z</option>
        </select>
        <div className="row">
          <button className={`icon-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid">
            <Icon name="grid" />
          </button>
          <button className={`icon-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List">
            <Icon name="list" />
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="tag-filter">
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              className={`chip${activeTags.includes(tag) ? ' active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag} <span className="count">{count}</span>
            </button>
          ))}
          {hasFilters && (
            <button className="chip" onClick={clearFilters}>Clear</button>
          )}
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && entries.length === 0 && (
        <div className="empty">
          <div className="big">📚</div>
          <h2>Your shelf is empty</h2>
          <p>Create a book from scratch or import one to get started.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => navigate('/studio/new')}>
              <Icon name="plus" size={16} /> New book
            </button>
            <button className="btn" onClick={() => navigate('/import')}>
              <Icon name="import" size={16} /> Import
            </button>
          </div>
        </div>
      )}

      {!loading && entries.length > 0 && visible.length === 0 && (
        <div className="empty"><p>No books match your search.</p></div>
      )}

      {!loading && visible.length > 0 && (
        view === 'grid' ? (
          <div className="book-grid">
            {visible.map((e) => <BookCard key={e.id} entry={e} onOpen={open} onEdit={edit} />)}
          </div>
        ) : (
          <div className="book-list">
            {visible.map((e) => <BookRow key={e.id} entry={e} onOpen={open} onEdit={edit} />)}
          </div>
        )
      )}
    </div>
  )
}
