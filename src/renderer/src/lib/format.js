export function formatCount(n) {
  if (n == null) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function formatDate(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return ''
  }
}

export function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < 2 * day) return 'yesterday'
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`
  return formatDate(ts)
}
