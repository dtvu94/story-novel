// Build a URL the renderer can load for an image stored inside a book folder.
// Files are served by the custom `asset://` protocol registered in main.
//   assetUrl('<bookId>', 'assets/cover.jpg') -> asset://book/<bookId>/assets/cover.jpg
export function assetUrl(bookId, relPath) {
  if (!bookId || !relPath) return null
  const segs = String(relPath).split('/').map(encodeURIComponent).join('/')
  return `asset://book/${encodeURIComponent(bookId)}/${segs}`
}

// Cover uses the same resolution.
export const coverUrl = assetUrl
