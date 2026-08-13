const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) StoryShelf/0.1',
  'Accept-Language': '*'
}

// Hosts that asked to be fetched politely: all requests to such a host are
// serialized and spaced at least `delayMs` apart, including cover/chapter
// image downloads that go through fetchImage.
const hostGates = new Map()

/** Register a polite delay for the host of `url` (adapters for slow sites call this). */
export function throttleHost(url, delayMs) {
  try {
    const host = new URL(url).host
    if (!hostGates.has(host)) hostGates.set(host, { delayMs, chain: Promise.resolve() })
  } catch {
    /* ignore unparsable URLs */
  }
}

async function gated(url, run) {
  let gate = null
  try {
    gate = hostGates.get(new URL(url).host)
  } catch {
    /* not a URL we gate */
  }
  if (!gate) return run()
  const turn = gate.chain
  let release
  gate.chain = new Promise((resolve) => (release = resolve))
  await turn
  try {
    return await run()
  } finally {
    setTimeout(release, gate.delayMs)
  }
}

export function fetchText(url) {
  return gated(url, async () => {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.text()
  })
}

export function fetchImage(url) {
  return gated(url, async () => {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    const ext = ct.includes('png')
      ? '.png'
      : ct.includes('webp')
        ? '.webp'
        : ct.includes('gif')
          ? '.gif'
          : ct.includes('svg')
            ? '.svg'
            : '.jpg'
    return { data: new Uint8Array(await res.arrayBuffer()), ext }
  })
}
