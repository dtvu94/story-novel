// Reader comfort presets + defaults. Colors are applied as CSS variables on the
// reader root. When theme === 'custom', the user's textColor/bgColor win.
export const READER_THEMES = {
  light: { label: 'Light', bg: '#ffffff', fg: '#1f2328' },
  sepia: { label: 'Sepia', bg: '#f4ecd8', fg: '#5b4636' },
  dark: { label: 'Dark', bg: '#1a1a1e', fg: '#d7d7db' },
  night: { label: 'Night (black)', bg: '#000000', fg: '#b8b8bd' }
}

export const READER_FONTS = [
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Merriweather-like serif', value: 'ui-serif, Georgia, Cambria, serif' },
  { label: 'System sans', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Verdana (sans)', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, "Cascadia Code", Consolas, monospace' }
]

export const DEFAULT_SETTINGS = {
  reader: {
    theme: 'sepia',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 19,
    lineHeight: 1.75,
    letterSpacing: 0,
    maxWidth: 720,
    margin: 28,
    textColor: null,
    bgColor: null
  },
  app: {
    lastMode: 'library',
    viewMode: 'grid'
  }
}

/** Resolve effective bg/fg colors given the reader settings. */
export function resolveReaderColors(reader) {
  if (reader.theme === 'custom') {
    return {
      bg: reader.bgColor || READER_THEMES.light.bg,
      fg: reader.textColor || READER_THEMES.light.fg
    }
  }
  const theme = READER_THEMES[reader.theme] || READER_THEMES.sepia
  return { bg: theme.bg, fg: theme.fg }
}
