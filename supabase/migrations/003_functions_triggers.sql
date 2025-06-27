-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'driver');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update driver location
CREATE OR REPLACE FUNCTION public.update_driver_location(
    p_driver_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_job_id UUID DEFAULT NULL,
    p_speed DECIMAL DEFAULT NULL,
    p_heading DECIMAL DEFAULT NULL,
    p_accuracy DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update driver's current location
    UPDATE public.drivers 
    SET 
        current_location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
        current_location_timestamp = NOW()
    WHERE id = p_driver_id;
    
    -- Insert tracking data
    INSERT INTO public.tracking_data (
        driver_id, job_id, location, speed, heading, accuracy, timestamp
    ) VALUES (
        p_driver_id, 
        p_job_id, 
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
        p_speed, 
        p_heading, 
        p_accuracy, 
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION public.calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby drivers
CREATE OR REPLACE FUNCTION public.get_nearby_drivers(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
    driver_id UUID,
    user_id UUID,
    full_name TEXT,
    distance_km DECIMAL,
    status driver_status,
    vehicle_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.user_id,
        u.full_name,
        (ST_Distance(
            d.current_location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) / 1000)::DECIMAL as distance_km,
        d.status,
        d.vehicle_id
    FROM public.drivers d
    JOIN public.users u ON d.user_id = u.id
    WHERE 
        d.current_location IS NOT NULL
        AND d.status = 'available'
        AND ST_DWithin(
            d.current_location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            p_radius_km * 1000
        )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to assign job to driver
CREATE OR REPLACE FUNCTION public.assign_job_to_driver(
    p_job_id UUID,
    p_driver_id UUID,
    p_vehicle_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    driver_vehicle_id UUID;
BEGIN
    -- Get driver's current vehicle if not specified
    IF p_vehicle_id IS NULL THEN
        SELECT vehicle_id INTO driver_vehicle_id FROM public.drivers WHERE id = p_driver_id;
        p_vehicle_id := driver_vehicle_id;
    END IF;
    
    -- Check if driver is available
    IF NOT EXISTS (
        SELECT 1 FROM public.drivers 
        WHERE id = p_driver_id AND status = 'available'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if vehicle is available (if specified)
    IF p_vehicle_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.vehicles 
        WHERE id = p_vehicle_id AND status = 'available'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Update job
    UPDATE public.jobs 
    SET 
        driver_id = p_driver_id,
        vehicle_id = p_vehicle_id,
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_job_id AND status = 'pending';
    
    -- Update driver status
    UPDATE public.drivers 
    SET 
        status = 'on_duty',
        vehicle_id = p_vehicle_id,
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    -- Update vehicle status
    IF p_vehicle_id IS NOT NULL THEN
        UPDATE public.vehicles 
        SET 
            status = 'in_use',
            updated_at = NOW()
        WHERE id = p_vehicle_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete job
CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    job_driver_id UUID;
    job_vehicle_id UUID;
BEGIN
    -- Get job details
    SELECT driver_id, vehicle_id INTO job_driver_id, job_vehicle_id
    FROM public.jobs WHERE id = p_job_id;
    
    -- Update job status
    UPDATE public.jobs 
    SET 
        status = 'completed',
        actual_delivery = NOW(),
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Update driver status
    UPDATE public.drivers 
    SET 
        status = 'available',
        updated_at = NOW()
    WHERE id = job_driver_id;
    
    -- Update vehicle status
    IF job_vehicle_id IS NOT NULL THEN
        UPDATE public.vehicles 
        SET 
            status = 'available',
            updated_at = NOW()
        WHERE id = job_vehicle_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
