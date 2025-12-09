import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Games } from './pages/Games'
import { Users } from './pages/Users'
import { Timeline } from './pages/Timeline'
import { Export } from './pages/Export'
import { Configuration } from './pages/Configuration'
import GameInsights from './pages/GameInsights'
import CostMetrics from './pages/CostMetrics'
import Moderation from './pages/Moderation'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="games" element={<Games />} />
          <Route path="users" element={<Users />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="export" element={<Export />} />
          <Route path="insights" element={<GameInsights />} />
          <Route path="cost-metrics" element={<CostMetrics />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="config" element={<Configuration />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
