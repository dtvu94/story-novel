// Thin accessor for the preload-exposed bridge. Keeps `window.api` out of
// component code and gives one place to stub during any future testing.
//
// window.api only exists inside the Electron window (injected by the preload
// script). If someone opens the dev-server URL in a normal browser there is no
// backend at all — fail with a message that says so instead of
// "can't access property … of undefined".
export const api =
  window.api ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Story Shelf must run inside the desktop app window — this page has no backend. ' +
            'Use the Electron window opened by `npm run dev`, not a browser tab.'
        )
      }
    }
  )
