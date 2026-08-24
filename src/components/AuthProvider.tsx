'use client'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface UserSession {
  email: string
  nombre: string
  rol: string
  username: string
}

interface AuthContextType {
  user: UserSession | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, contrasena: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshSession: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          try {
            localStorage.setItem('qms_user_cached', JSON.stringify(data.user))
          } catch {}
          return
        }
      }
      setUser(null)
      try {
        localStorage.removeItem('qms_user_cached')
      } catch {}
    } catch {
      // Offline fallback: try reading cached user if session cookie is present
      try {
        const cached = localStorage.getItem('qms_user_cached')
        if (cached) {
          setUser(JSON.parse(cached))
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial user load from local cache for zero delay
    try {
      const cached = localStorage.getItem('qms_user_cached')
      if (cached) {
        setUser(JSON.parse(cached))
      }
    } catch {}

    refreshSession()
  }, [refreshSession])

  const login = async (username: string, contrasena: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, contrasena })
      })

      const data = await res.json()

      if (res.ok && data.success && data.user) {
        setUser(data.user)
        try {
          localStorage.setItem('qms_user_cached', JSON.stringify(data.user))
        } catch {}
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Credenciales inválidas' }
      }
    } catch (err: any) {
      return { success: false, error: 'Error de conexión con el servidor' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    try {
      localStorage.removeItem('qms_user_cached')
    } catch {}
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
