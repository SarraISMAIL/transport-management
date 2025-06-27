import { supabase } from './supabase'
import type { 
  User, 
  Driver, 
  Vehicle, 
  Job, 
  TrackingData, 
  MaintenanceRecord, 
  FuelRecord, 
  Notification,
  CreateJobForm,
  CreateDriverForm,
  CreateVehicleForm,
  DashboardStats
} from '@/types'

// User operations
export const userService = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data
  },

  async updateProfile(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// Driver operations
export const driverService = {
  async getAllDrivers(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        user:users(*),
        vehicle:vehicles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getDriverById(id: string): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        user:users(*),
        vehicle:vehicles(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createDriver(driverData: CreateDriverForm): Promise<Driver> {
    // First create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: driverData.email,
      password: 'temp_password_123', // Should be changed on first login
      options: {
        data: {
          full_name: driverData.full_name,
          role: 'driver'
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Then create the driver record
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        user_id: authData.user.id,
        license_number: driverData.license_number,
        license_expiry: driverData.license_expiry
      })
      .select(`
        *,
        user:users(*),
        vehicle:vehicles(*)
      `)
      .single()

    if (error) throw error
    return data
  },

  async updateDriverStatus(id: string, status: Driver['status']): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        user:users(*),
        vehicle:vehicles(*)
      `)
      .single()

    if (error) throw error
    return data
  },

  async updateDriverLocation(
    driverId: string, 
    latitude: number, 
    longitude: number,
    jobId?: string,
    speed?: number,
    heading?: number,
    accuracy?: number
  ): Promise<void> {
    const { error } = await supabase.rpc('update_driver_location', {
      p_driver_id: driverId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_job_id: jobId,
      p_speed: speed,
      p_heading: heading,
      p_accuracy: accuracy
    })

    if (error) throw error
  }
}

// Vehicle operations
export const vehicleService = {
  async getAllVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createVehicle(vehicleData: CreateVehicleForm): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Job operations
export const jobService = {
  async getAllJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        driver:drivers(*, user:users(*)),
        vehicle:vehicles(*),
        creator:users(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getJobById(id: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        driver:drivers(*, user:users(*)),
        vehicle:vehicles(*),
        creator:users(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createJob(jobData: CreateJobForm, createdBy: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...jobData,
        pickup_address: jobData.pickup_location.address,
        pickup_latitude: jobData.pickup_location.latitude,
        pickup_longitude: jobData.pickup_location.longitude,
        pickup_contact_name: jobData.pickup_location.contact_name,
        pickup_contact_phone: jobData.pickup_location.contact_phone,
        pickup_notes: jobData.pickup_location.notes,
        dropoff_address: jobData.dropoff_location.address,
        dropoff_latitude: jobData.dropoff_location.latitude,
        dropoff_longitude: jobData.dropoff_location.longitude,
        dropoff_contact_name: jobData.dropoff_location.contact_name,
        dropoff_contact_phone: jobData.dropoff_location.contact_phone,
        dropoff_notes: jobData.dropoff_location.notes,
        created_by: createdBy
      })
      .select(`
        *,
        driver:drivers(*, user:users(*)),
        vehicle:vehicles(*),
        creator:users(*)
      `)
      .single()

    if (error) throw error
    return data
  },

  async assignJob(jobId: string, driverId: string, vehicleId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('assign_job_to_driver', {
      p_job_id: jobId,
      p_driver_id: driverId,
      p_vehicle_id: vehicleId
    })

    if (error) throw error
    return data
  },

  async updateJobStatus(id: string, status: Job['status']): Promise<Job> {
    const updates: any = { status }
    
    if (status === 'in_progress') {
      updates.actual_pickup = new Date().toISOString()
    } else if (status === 'completed') {
      updates.actual_delivery = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        driver:drivers(*, user:users(*)),
        vehicle:vehicles(*),
        creator:users(*)
      `)
      .single()

    if (error) throw error
    return data
  }
}
