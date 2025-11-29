import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Games } from './pages/Games'
import { Users } from './pages/Users'
import { Timeline } from './pages/Timeline'
import { Export } from './pages/Export'
import { Configuration } from './pages/Configuration'

import { AuthProvider } from './components/auth/AuthProvider'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Login } from './pages/Login'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="games" element={<Games />} />
            <Route path="users" element={<Users />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="export" element={<Export />} />
            <Route path="config" element={
              <ProtectedRoute>
                <Configuration />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
