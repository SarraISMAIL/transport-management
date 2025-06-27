'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo)
        return
      }

      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        // Redirect based on user role
        switch (user.role) {
          case 'driver':
            router.push('/driver/dashboard')
            break
          case 'dispatcher':
            router.push('/dashboard')
            break
          case 'admin':
            router.push('/dashboard')
            break
          default:
            router.push('/auth/login')
        }
        return
      }
    }
  }, [user, loading, requiredRole, router, redirectTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return null
  }

  return <>{children}</>
}

// Role-specific route components
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  )
}

export function DispatcherRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="dispatcher">
      {children}
    </ProtectedRoute>
  )
}

export function DriverRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="driver">
      {children}
    </ProtectedRoute>
  )
}
