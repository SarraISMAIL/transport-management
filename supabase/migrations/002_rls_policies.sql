-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin or dispatcher
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role IN ('admin', 'dispatcher') FROM public.users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get driver id for a user
CREATE OR REPLACE FUNCTION public.get_driver_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.drivers WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins and dispatchers can view all users" ON public.users
    FOR SELECT USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Vehicles table policies
CREATE POLICY "All authenticated users can view vehicles" ON public.vehicles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and dispatchers can manage vehicles" ON public.vehicles
    FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

-- Drivers table policies
CREATE POLICY "Drivers can view their own profile" ON public.drivers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and dispatchers can view all drivers" ON public.drivers
    FOR SELECT USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Drivers can update their own profile" ON public.drivers
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins and dispatchers can manage drivers" ON public.drivers
    FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

-- Jobs table policies
CREATE POLICY "Drivers can view their assigned jobs" ON public.jobs
    FOR SELECT USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins and dispatchers can view all jobs" ON public.jobs
    FOR SELECT USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Drivers can update their assigned jobs" ON public.jobs
    FOR UPDATE USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins and dispatchers can manage jobs" ON public.jobs
    FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

-- Tracking data policies
CREATE POLICY "Drivers can insert their own tracking data" ON public.tracking_data
    FOR INSERT WITH CHECK (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can view their own tracking data" ON public.tracking_data
    FOR SELECT USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins and dispatchers can view all tracking data" ON public.tracking_data
    FOR SELECT USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Admins can manage all tracking data" ON public.tracking_data
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Maintenance records policies
CREATE POLICY "All authenticated users can view maintenance records" ON public.maintenance_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and dispatchers can manage maintenance records" ON public.maintenance_records
    FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

-- Fuel records policies
CREATE POLICY "Drivers can insert fuel records for their vehicle" ON public.fuel_records
    FOR INSERT WITH CHECK (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "All authenticated users can view fuel records" ON public.fuel_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and dispatchers can manage fuel records" ON public.fuel_records
    FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins and dispatchers can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Admins can manage all notifications" ON public.notifications
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');
