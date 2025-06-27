export type UserRole = 'admin' | 'dispatcher' | 'driver'

export type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service'

export type DriverStatus = 'available' | 'on_duty' | 'off_duty' | 'break'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  user_id: string
  license_number: string
  license_expiry: string
  status: DriverStatus
  current_location?: {
    latitude: number
    longitude: number
    timestamp: string
  }
  vehicle_id?: string
  created_at: string
  updated_at: string
  user?: User
  vehicle?: Vehicle
}

export interface Vehicle {
  id: string
  license_plate: string
  make: string
  model: string
  year: number
  status: VehicleStatus
  fuel_capacity: number
  current_fuel?: number
  mileage: number
  last_maintenance?: string
  next_maintenance?: string
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  title: string
  description?: string
  status: JobStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  pickup_location: Location
  dropoff_location: Location
  scheduled_pickup: string
  scheduled_delivery: string
  actual_pickup?: string
  actual_delivery?: string
  driver_id?: string
  vehicle_id?: string
  estimated_distance?: number
  estimated_duration?: number
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  driver?: Driver
  vehicle?: Vehicle
  creator?: User
}

export interface Location {
  address: string
  latitude: number
  longitude: number
  contact_name?: string
  contact_phone?: string
  notes?: string
}

export interface TrackingData {
  id: string
  driver_id: string
  job_id?: string
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  accuracy?: number
  timestamp: string
  created_at: string
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  type: 'routine' | 'repair' | 'inspection' | 'fuel'
  description: string
  cost?: number
  mileage: number
  performed_by?: string
  performed_at: string
  next_due?: string
  notes?: string
  created_at: string
  updated_at: string
  vehicle?: Vehicle
}

export interface FuelRecord {
  id: string
  vehicle_id: string
  driver_id: string
  amount: number
  cost: number
  mileage: number
  location?: string
  timestamp: string
  created_at: string
  vehicle?: Vehicle
  driver?: Driver
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  created_at: string
  data?: Record<string, any>
}

// Dashboard Statistics
export interface DashboardStats {
  total_jobs: number
  active_jobs: number
  completed_jobs: number
  total_drivers: number
  available_drivers: number
  total_vehicles: number
  available_vehicles: number
  maintenance_due: number
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Form Types
export interface CreateJobForm {
  title: string
  description?: string
  priority: Job['priority']
  pickup_location: Location
  dropoff_location: Location
  scheduled_pickup: string
  scheduled_delivery: string
  driver_id?: string
  vehicle_id?: string
  notes?: string
}

export interface CreateDriverForm {
  email: string
  full_name: string
  phone?: string
  license_number: string
  license_expiry: string
}

export interface CreateVehicleForm {
  license_plate: string
  make: string
  model: string
  year: number
  fuel_capacity: number
  mileage: number
}
