import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { jobService, userService } from '@/lib/database'

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const driverId = searchParams.get('driver_id')

    let jobs = await jobService.getAllJobs()

    // Filter jobs based on user role
    if (currentUser.role === 'driver') {
      // Drivers only see their assigned jobs
      jobs = jobs.filter(job => job.driver?.user_id === currentUser.id)
    }

    // Apply additional filters
    if (status) {
      jobs = jobs.filter(job => job.status === status)
    }

    if (driverId) {
      jobs = jobs.filter(job => job.driver_id === driverId)
    }

    return NextResponse.json({ data: jobs })
  } catch (error: any) {
    console.error('Error fetching jobs:', error)
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

    const currentUser = await userService.getCurrentUser()
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      priority = 'medium',
      pickup_location,
      dropoff_location,
      scheduled_pickup,
      scheduled_delivery,
      driver_id,
      vehicle_id,
      notes
    } = body

    // Validate required fields
    if (!title || !pickup_location || !dropoff_location || !scheduled_pickup || !scheduled_delivery) {
      return NextResponse.json(
        { error: 'Title, pickup location, dropoff location, scheduled pickup, and scheduled delivery are required' },
        { status: 400 }
      )
    }

    // Validate location objects
    if (!pickup_location.address || !pickup_location.latitude || !pickup_location.longitude) {
      return NextResponse.json(
        { error: 'Pickup location must include address, latitude, and longitude' },
        { status: 400 }
      )
    }

    if (!dropoff_location.address || !dropoff_location.latitude || !dropoff_location.longitude) {
      return NextResponse.json(
        { error: 'Dropoff location must include address, latitude, and longitude' },
        { status: 400 }
      )
    }

    const job = await jobService.createJob({
      title,
      description,
      priority,
      pickup_location,
      dropoff_location,
      scheduled_pickup,
      scheduled_delivery,
      driver_id,
      vehicle_id,
      notes
    }, currentUser.id)

    return NextResponse.json({ 
      data: job,
      message: 'Job created successfully'
    })
  } catch (error: any) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
