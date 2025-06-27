-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver');
CREATE TYPE job_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');
CREATE TYPE driver_status AS ENUM ('available', 'on_duty', 'off_duty', 'break');
CREATE TYPE maintenance_type AS ENUM ('routine', 'repair', 'inspection', 'fuel');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    license_plate TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    status vehicle_status NOT NULL DEFAULT 'available',
    fuel_capacity DECIMAL(8,2) NOT NULL,
    current_fuel DECIMAL(8,2),
    mileage INTEGER NOT NULL DEFAULT 0,
    last_maintenance TIMESTAMP WITH TIME ZONE,
    next_maintenance TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table
CREATE TABLE public.drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    status driver_status NOT NULL DEFAULT 'off_duty',
    current_location GEOGRAPHY(POINT),
    current_location_timestamp TIMESTAMP WITH TIME ZONE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE public.jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status job_status NOT NULL DEFAULT 'pending',
    priority job_priority NOT NULL DEFAULT 'medium',
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    pickup_contact_name TEXT,
    pickup_contact_phone TEXT,
    pickup_notes TEXT,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10,8) NOT NULL,
    dropoff_longitude DECIMAL(11,8) NOT NULL,
    dropoff_contact_name TEXT,
    dropoff_contact_phone TEXT,
    dropoff_notes TEXT,
    scheduled_pickup TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_delivery TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_pickup TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    estimated_distance DECIMAL(8,2),
    estimated_duration INTEGER, -- in minutes
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking data table
CREATE TABLE public.tracking_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    speed DECIMAL(5,2), -- km/h
    heading DECIMAL(5,2), -- degrees
    accuracy DECIMAL(8,2), -- meters
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance records table
CREATE TABLE public.maintenance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    type maintenance_type NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    mileage INTEGER NOT NULL,
    performed_by TEXT,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    next_due TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel records table
CREATE TABLE public.fuel_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL NOT NULL,
    amount DECIMAL(8,2) NOT NULL, -- liters
    cost DECIMAL(10,2) NOT NULL,
    mileage INTEGER NOT NULL,
    location TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX idx_drivers_vehicle_id ON public.drivers(vehicle_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_driver_id ON public.jobs(driver_id);
CREATE INDEX idx_jobs_vehicle_id ON public.jobs(vehicle_id);
CREATE INDEX idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX idx_jobs_scheduled_pickup ON public.jobs(scheduled_pickup);
CREATE INDEX idx_tracking_data_driver_id ON public.tracking_data(driver_id);
CREATE INDEX idx_tracking_data_job_id ON public.tracking_data(job_id);
CREATE INDEX idx_tracking_data_timestamp ON public.tracking_data(timestamp);
CREATE INDEX idx_maintenance_records_vehicle_id ON public.maintenance_records(vehicle_id);
CREATE INDEX idx_fuel_records_vehicle_id ON public.fuel_records(vehicle_id);
CREATE INDEX idx_fuel_records_driver_id ON public.fuel_records(driver_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Create spatial indexes for location data
CREATE INDEX idx_drivers_current_location ON public.drivers USING GIST(current_location);
CREATE INDEX idx_tracking_data_location ON public.tracking_data USING GIST(location);
