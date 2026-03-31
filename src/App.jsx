import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeProvider'
import { ToastProvider } from './components/ui/toast'
import DailyNoteApplication from './components/DailyNoteApplication'
import LoginPage from './components/LoginPage'
import PublicSharePage from './components/PublicSharePage'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            D<span className="text-slate-400">.</span>Ops
          </h1>
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full mx-auto mt-4" />
        </div>
      </div>
    )
  }

  return user ? <DailyNoteApplication /> : <LoginPage />
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/share/:token" element={<PublicSharePage />} />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
