import { useState } from 'react'

export default function TagInput({ value = [], onChange, placeholder = 'Add tag and press Enter' }) {
  const [draft, setDraft] = useState('')

  const add = (raw) => {
    const tag = raw.trim().replace(/,+$/, '')
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      {value.map((t) => (
        <span className="tag-pill" key={t}>
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
      />
    </div>
  )
}
