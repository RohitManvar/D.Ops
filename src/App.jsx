import { AuthProvider, useAuth } from './context/AuthProvider'
import DailyNoteApplication from './components/DailyNoteApplication'
import LoginPage from './components/LoginPage'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
            D<span className="text-slate-400">.</span>Ops
          </h1>
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mt-4" />
        </div>
      </div>
    )
  }

  return user ? <DailyNoteApplication /> : <LoginPage />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
