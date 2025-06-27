'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Truck } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect based on user role
        switch (user.role) {
          case 'driver':
            router.push('/driver/dashboard')
            break
          case 'dispatcher':
          case 'admin':
            router.push('/dashboard')
            break
          default:
            router.push('/auth/login')
        }
      } else {
        router.push('/auth/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-600 rounded-full">
            <Truck className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Transport Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Comprehensive fleet and delivery management solution
        </p>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    </div>
  )
}
