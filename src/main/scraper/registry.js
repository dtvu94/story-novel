import { genericAdapter } from './generic.js'
import { siteAdapters } from './adapters/index.js'

function safeMatch(adapter, url) {
  try {
    return adapter.matches(url)
  } catch {
    return false
  }
}

/** Pick the first site adapter that claims the URL, else the generic fallback. */
export function resolveAdapter(url) {
  return siteAdapters.find((a) => safeMatch(a, url)) || genericAdapter
}
