import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'
import { Toaster, sileo } from 'sileo'
import 'sileo/styles.css'

function ToastBridge() {
  useEffect(() => {
    const handler = ({ detail: { message, type = 'error' } }) => {
      if (type === 'success') sileo.success({ title: message })
      else if (type === 'warning') sileo.warning({ title: message })
      else sileo.error({ title: message })
    }
    window.addEventListener('leadup:toast', handler)
    return () => window.removeEventListener('leadup:toast', handler)
  }, [])
  return null
}
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Analytics from './pages/Analytics'
import Ajustes from './pages/Ajustes'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/pipeline"
        element={
          <PrivateRoute>
            <Pipeline />
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <AdminRoute>
            <Analytics />
          </AdminRoute>
        }
      />
      <Route
        path="/ajustes"
        element={
          <AdminRoute>
            <Ajustes />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="bottom-right" theme="light" />
      <ToastBridge />
    </ThemeProvider>
  )
}
