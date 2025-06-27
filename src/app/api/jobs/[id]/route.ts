import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { jobService, userService } from '@/lib/database'

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

    const job = await jobService.getJobById(params.id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Drivers can only see their assigned jobs
    if (currentUser.role === 'driver' && job.driver?.user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: job })
  } catch (error: any) {
    console.error('Error fetching job:', error)
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

    const job = await jobService.getJobById(params.id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json()

    // Check permissions based on what's being updated
    if (body.status) {
      // Drivers can update status of their assigned jobs
      if (currentUser.role === 'driver') {
        if (job.driver?.user_id !== currentUser.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        
        // Drivers can only update to certain statuses
        const allowedStatuses = ['in_progress', 'completed']
        if (!allowedStatuses.includes(body.status)) {
          return NextResponse.json({ error: 'Invalid status for driver' }, { status: 400 })
        }
      }

      const updatedJob = await jobService.updateJobStatus(params.id, body.status)
      return NextResponse.json({ 
        data: updatedJob,
        message: 'Job status updated successfully'
      })
    }

    // For other updates, only admins and dispatchers can modify
    if (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle job assignment
    if (body.driver_id !== undefined || body.vehicle_id !== undefined) {
      if (body.driver_id) {
        const success = await jobService.assignJob(params.id, body.driver_id, body.vehicle_id)
        if (!success) {
          return NextResponse.json(
            { error: 'Failed to assign job. Driver or vehicle may not be available.' },
            { status: 400 }
          )
        }
      }
    }

    const updatedJob = await jobService.getJobById(params.id)
    return NextResponse.json({ 
      data: updatedJob,
      message: 'Job updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
