-- Insert sample vehicles
INSERT INTO public.vehicles (id, license_plate, make, model, year, fuel_capacity, current_fuel, mileage) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ABC-123', 'Ford', 'Transit', 2022, 80.0, 65.0, 15000),
('550e8400-e29b-41d4-a716-446655440002', 'DEF-456', 'Mercedes', 'Sprinter', 2023, 75.0, 50.0, 8000),
('550e8400-e29b-41d4-a716-446655440003', 'GHI-789', 'Iveco', 'Daily', 2021, 90.0, 70.0, 25000),
('550e8400-e29b-41d4-a716-446655440004', 'JKL-012', 'Volkswagen', 'Crafter', 2022, 85.0, 40.0, 12000),
('550e8400-e29b-41d4-a716-446655440005', 'MNO-345', 'Renault', 'Master', 2023, 80.0, 60.0, 5000);

-- Note: Sample users and drivers would typically be created through the authentication system
-- This is just for reference of the data structure

-- Sample maintenance records
INSERT INTO public.maintenance_records (vehicle_id, type, description, cost, mileage, performed_by, performed_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'routine', 'Oil change and filter replacement', 150.00, 14500, 'Service Center A', '2024-06-15 10:00:00'),
('550e8400-e29b-41d4-a716-446655440002', 'inspection', 'Annual safety inspection', 200.00, 7500, 'Service Center B', '2024-06-10 14:30:00'),
('550e8400-e29b-41d4-a716-446655440003', 'repair', 'Brake pad replacement', 300.00, 24000, 'Service Center A', '2024-06-05 09:15:00');

-- Update next maintenance dates
UPDATE public.vehicles SET 
    last_maintenance = '2024-06-15 10:00:00',
    next_maintenance = '2024-09-15 10:00:00'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE public.vehicles SET 
    last_maintenance = '2024-06-10 14:30:00',
    next_maintenance = '2024-12-10 14:30:00'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE public.vehicles SET 
    last_maintenance = '2024-06-05 09:15:00',
    next_maintenance = '2024-08-05 09:15:00'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';
