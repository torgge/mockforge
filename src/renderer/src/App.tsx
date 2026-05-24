import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProjectsPage } from './pages/ProjectsPage'
import { SchemaEditorPage } from './pages/SchemaEditorPage'
import { GeneratorPage } from './pages/GeneratorPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/project/:projectId/schema" element={<SchemaEditorPage />} />
          <Route path="/project/:projectId/generator" element={<GeneratorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
