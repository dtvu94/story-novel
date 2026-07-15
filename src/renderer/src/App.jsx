import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LibraryPage from './features/library/LibraryPage'
import StudioPage from './features/studio/StudioPage'
import ReaderPage from './features/reader/ReaderPage'
import ImportPage from './features/import/ImportPage'
import { useSettings } from './store/useSettings'

export default function App() {
  const loadSettings = useSettings((s) => s.load)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LibraryPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="studio/:bookId" element={<StudioPage />} />
        </Route>
        <Route path="read/:bookId" element={<ReaderPage />} />
        <Route path="read/:bookId/:chapterId" element={<ReaderPage />} />
      </Routes>
    </HashRouter>
  )
}
