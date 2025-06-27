import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { vehicleService, userService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vehicles = await vehicleService.getAllVehicles()
    return NextResponse.json({ data: vehicles })
  } catch (error: any) {
    console.error('Error fetching vehicles:', error)
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

    // Check if user has permission to create vehicles
    const currentUser = await userService.getCurrentUser()
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { license_plate, make, model, year, fuel_capacity, mileage } = body

    if (!license_plate || !make || !model || !year || !fuel_capacity || mileage === undefined) {
      return NextResponse.json(
        { error: 'All vehicle fields are required' },
        { status: 400 }
      )
    }

    const vehicle = await vehicleService.createVehicle({
      license_plate,
      make,
      model,
      year: parseInt(year),
      fuel_capacity: parseFloat(fuel_capacity),
      mileage: parseInt(mileage)
    })

    return NextResponse.json({ 
      data: vehicle,
      message: 'Vehicle created successfully'
    })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A vehicle with this license plate already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
