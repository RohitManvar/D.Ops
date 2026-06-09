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
import CommandPalette from './components/CommandPalette'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
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
              <Route path="/daily-update" element={<ProtectedRoute><DailyUpdateModule /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/reviewer" element={<ProtectedRoute allowedRoles={['reviewer']}><ReviewerDashboard /></ProtectedRoute>} />

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CommandPalette />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
