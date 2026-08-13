const HEADERS = {
  // Honest identification — this is a desktop reader fetching pages a person
  // asked for, and sites should be able to see that and rate-limit us fairly.
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) StoryShelf/0.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': '*'
}

// A site that answers 403/451 has told us to go away. Retrying makes the ban
// worse, so those are terminal; only overload/throttle codes are retried.
const BLOCK_STATUS = new Set([401, 403, 451])
const RETRY_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BACKOFF_MS = 3000

// After a block, stop touching that host for a while — even if a caller keeps
// asking. Hammering a host that just banned us is what turns a temporary
// rate-limit into a long IP ban.
const BLOCK_COOLDOWN_MS = 30 * 60 * 1000

/** Thrown when a site refuses us (ban, rate-limit, challenge page). */
export class BlockedError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'BlockedError'
    this.blocked = true // survives structured-clone across IPC better than instanceof
    this.status = status
  }
}

// Per-host politeness state: serialize requests, space them out, remember bans.
const hosts = new Map()

function hostState(url) {
  let host
  try {
    host = new URL(url).host
  } catch {
    return null
  }
  if (!hosts.has(host)) {
    hosts.set(host, { host, delayMs: 0, chain: Promise.resolve(), blockedUntil: 0 })
  }
  return hosts.get(host)
}

/** Register a polite delay for the host of `url` (adapters for slow sites call this). */
export function throttleHost(url, delayMs) {
  const state = hostState(url)
  if (state) state.delayMs = Math.max(state.delayMs, delayMs)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Spread requests out a little so they don't land on an exact metronome. */
const jittered = (ms) => (ms > 0 ? Math.round(ms * (0.75 + Math.random() * 0.75)) : 0)

async function send(url, state) {
  let wait = BACKOFF_MS
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    if (res.ok) return res
    if (BLOCK_STATUS.has(res.status)) {
      throw new BlockedError(`${state?.host || 'The site'} refused the request (HTTP ${res.status})`, res.status)
    }
    if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(retryAfter > 0 ? retryAfter * 1000 : wait)
      wait *= 2
      continue
    }
    if (res.status === 429) {
      throw new BlockedError(`${state?.host || 'The site'} is rate-limiting us (HTTP 429)`, 429)
    }
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
}

async function gated(url, run) {
  const state = hostState(url)
  if (!state) return run(null)
  if (state.blockedUntil > Date.now()) {
    const mins = Math.ceil((state.blockedUntil - Date.now()) / 60000)
    throw new BlockedError(
      `${state.host} blocked us earlier — not sending more requests for ~${mins} more minute(s)`,
      state.blockStatus
    )
  }
  const turn = state.chain
  let release
  state.chain = new Promise((resolve) => (release = resolve))
  await turn
  try {
    return await run(state)
  } catch (err) {
    if (err?.blocked) {
      state.blockedUntil = Date.now() + BLOCK_COOLDOWN_MS
      state.blockStatus = err.status
    }
    throw err
  } finally {
    setTimeout(release, jittered(state.delayMs))
  }
}

export function fetchText(url) {
  return gated(url, async (state) => (await send(url, state)).text())
}

export function fetchImage(url) {
  return gated(url, async (state) => {
    const res = await send(url, state)
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
