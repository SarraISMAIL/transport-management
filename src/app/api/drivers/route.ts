import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { driverService, userService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await userService.getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Drivers can only see their own profile, others can see all
    if (currentUser.role === 'driver') {
      const driver = await driverService.getDriverById(currentUser.id)
      return NextResponse.json({ data: driver ? [driver] : [] })
    }

    const drivers = await driverService.getAllDrivers()
    return NextResponse.json({ data: drivers })
  } catch (error: any) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create drivers
    const currentUser = await userService.getCurrentUser()
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, phone, license_number, license_expiry } = body

    if (!email || !full_name || !license_number || !license_expiry) {
      return NextResponse.json(
        { error: 'Email, full name, license number, and license expiry are required' },
        { status: 400 }
      )
    }

    const driver = await driverService.createDriver({
      email,
      full_name,
      phone,
      license_number,
      license_expiry
    })

    return NextResponse.json({ 
      data: driver,
      message: 'Driver created successfully'
    })
  } catch (error: any) {
    console.error('Error creating driver:', error)
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('license_number')) {
        return NextResponse.json(
          { error: 'A driver with this license number already exists' },
          { status: 400 }
        )
      }
      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
