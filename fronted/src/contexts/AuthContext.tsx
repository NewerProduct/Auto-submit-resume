'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.auth.me()
      if (response.success && response.data) {
        setUser(response.data)
      }
    } catch (error) {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (phone: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.auth.signin({ phone, password })
      if (response.success && response.data) {
        localStorage.setItem('token', 'temp-token') // 实际应该使用真实的token
        setUser(response.data.user)
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (phone: string, password: string, email?: string) => {
    setLoading(true)
    try {
      const response = await api.auth.register({ phone, password, email })
      if (response.success && response.data) {
        localStorage.setItem('token', 'temp-token') // 实际应该使用真实的token
        setUser(response.data.user)
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.auth.signout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  const refreshUser = async () => {
    try {
      const response = await api.auth.me()
      if (response.success && response.data) {
        setUser(response.data)
      }
    } catch (error) {
      console.error('Refresh user error:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
