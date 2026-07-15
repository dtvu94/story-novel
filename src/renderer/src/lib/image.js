// Read a picked image File into raw bytes + extension for saving as a real file
// inside a book's assets folder (no base64 — the file stays viewable on disk).
export async function readImageFile(file) {
  const data = new Uint8Array(await file.arrayBuffer())
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.png').toLowerCase()
  return { data, ext }
}
