import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'leadup_theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem(THEME_KEY, 'light')
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggle, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
