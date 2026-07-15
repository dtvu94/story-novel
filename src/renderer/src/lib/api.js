// Thin accessor for the preload-exposed bridge. Keeps `window.api` out of
// component code and gives one place to stub during any future testing.
export const api = window.api
