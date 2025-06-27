'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { userService } from '@/lib/database'
import type { User, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setSupabaseUser(session.user)
        try {
          const userData = await userService.getCurrentUser()
          setUser(userData)
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          try {
            const userData = await userService.getCurrentUser()
            setUser(userData)
          } catch (error) {
            console.error('Error fetching user data:', error)
            setUser(null)
          }
        } else {
          setSupabaseUser(null)
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'driver') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in')
    
    const updatedUser = await userService.updateProfile(user.id, updates)
    setUser(updatedUser)
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Role-based access control hooks
export function useRequireAuth(requiredRole?: UserRole) {
  const { user, loading } = useAuth()
  
  if (loading) return { authorized: false, loading: true }
  if (!user) return { authorized: false, loading: false }
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return { authorized: false, loading: false }
  }
  
  return { authorized: true, loading: false }
}

export function useIsAdmin() {
  const { user } = useAuth()
  return user?.role === 'admin'
}

export function useIsDispatcher() {
  const { user } = useAuth()
  return user?.role === 'dispatcher' || user?.role === 'admin'
}

export function useIsDriver() {
  const { user } = useAuth()
  return user?.role === 'driver'
}
