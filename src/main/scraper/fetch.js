const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) StoryShelf/0.1',
  'Accept-Language': '*'
}

export async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export async function fetchImage(url) {
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
}
