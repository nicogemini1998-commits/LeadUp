import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'leadup_token'
const USER_KEY = 'leadup_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        setLoading(false)
        return
      }
      try {
        const res = await authApi.me()
        setUser(res.data)
        localStorage.setItem(USER_KEY, JSON.stringify(res.data))
      } catch {
        // Token invalid — clear session
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    verifyToken()
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password)
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isAuthenticated = Boolean(token && user)

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
