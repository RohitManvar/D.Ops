import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeProvider'
import { ToastProvider } from './components/ui/toast'
import ProtectedRoute from './components/ProtectedRoute'
import DailyNoteApplication from './components/DailyNoteApplication'
import LoginPage from './components/LoginPage'
import PublicSharePage from './components/PublicSharePage'
import DashboardHub from './components/DashboardHub'
import ProductBacklog from './components/workspace/ProductBacklog'
import SprintPlanning from './components/workspace/SprintPlanning'
import KanbanBoard from './components/workspace/KanbanBoard'
import ReviewerDashboard from './components/reviewer/ReviewerDashboard'
import DailyUpdateModule from './components/workspace/DailyUpdateModule'
import AnalyticsDashboard from './components/workspace/AnalyticsDashboard'
import GithubWork from './components/workspace/GithubWork'
import CommandPalette from './components/CommandPalette'
import MeshBackground from './components/ui/MeshBackground'
import FocusMode from './components/workspace/FocusMode'
import TimelineView from './components/workspace/TimelineView'
import SettingsHub from './components/workspace/SettingsHub'
import TeamRoster from './components/reviewer/TeamRoster'
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
              <MeshBackground>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/share/:token" element={<PublicSharePage />} />

                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute><DashboardHub /></ProtectedRoute>} />
                  <Route path="/daily-notes" element={<ProtectedRoute><DailyNoteApplication /></ProtectedRoute>} />
                  <Route path="/backlog" element={<ProtectedRoute><ProductBacklog /></ProtectedRoute>} />
                  <Route path="/sprints" element={<ProtectedRoute><SprintPlanning /></ProtectedRoute>} />
                  <Route path="/kanban" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
                  <Route path="/github-work" element={<ProtectedRoute><GithubWork /></ProtectedRoute>} />
                  <Route path="/daily-update" element={<ProtectedRoute><DailyUpdateModule /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
                  <Route path="/focus" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
                  <Route path="/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsHub /></ProtectedRoute>} />
                  <Route path="/reviewer" element={<ProtectedRoute allowedRoles={['reviewer']}><ReviewerDashboard /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute allowedRoles={['reviewer']}><TeamRoster /></ProtectedRoute>} />

                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MeshBackground>
            <CommandPalette />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
