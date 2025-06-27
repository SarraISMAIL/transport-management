import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { driverService, userService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const driver = await driverService.getDriverById(params.id)
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Drivers can only see their own profile, others can see all
    if (currentUser.role === 'driver' && driver.user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: driver })
  } catch (error: any) {
    console.error('Error fetching driver:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const driver = await driverService.getDriverById(params.id)
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Drivers can update their own profile, admins/dispatchers can update all
    if (currentUser.role === 'driver' && driver.user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // If updating status, check permissions
    if (body.status && currentUser.role === 'driver') {
      // Drivers can only update their own status to certain values
      const allowedStatuses = ['available', 'on_duty', 'off_duty', 'break']
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
    }

    const updatedDriver = await driverService.updateDriverStatus(params.id, body.status || driver.status)

    return NextResponse.json({ 
      data: updatedDriver,
      message: 'Driver updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating driver:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
