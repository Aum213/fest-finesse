-- Add new columns to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS area_sqft INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS booked_slots TEXT[] DEFAULT '{}';

-- Clear existing venues first if any exist
TRUNCATE TABLE public.events;
DELETE FROM public.venues;

-- Insert comprehensive dummy venues
INSERT INTO public.venues (name, capacity, type, area_sqft, facilities, booked_slots) VALUES
('Main Auditorium', 800, 'auditorium', 5000, 
 ARRAY['Stage', 'Projector', 'Sound System', 'AC', 'Lighting'], 
 ARRAY['2025-09-26 10:00-12:00']),
('Seminar Hall A', 200, 'seminar_hall', 2000, 
 ARRAY['Projector', 'AC', 'Sound System', 'WiFi'], 
 ARRAY[]::TEXT[]),
('Seminar Hall B', 150, 'seminar_hall', 1800, 
 ARRAY['Projector', 'AC', 'WiFi'], 
 ARRAY['2025-09-26 11:00-13:00']),
('Computer Lab 1', 60, 'computer_lab', 1200, 
 ARRAY['Computers', 'High-Speed WiFi', 'AC', 'Projector'], 
 ARRAY[]::TEXT[]),
('Computer Lab 2', 50, 'computer_lab', 1000, 
 ARRAY['Computers', 'High-Speed WiFi', 'AC'], 
 ARRAY[]::TEXT[]),
('Central Library Hall', 300, 'library_hall', 2500, 
 ARRAY['Seating', 'Projector', 'AC', 'WiFi'], 
 ARRAY['2025-09-26 14:00-16:00']),
('Open Ground A', 3000, 'outdoor_ground', 20000, 
 ARRAY['Stage Setup Possible', 'Open Air', 'Temporary Stalls'], 
 ARRAY[]::TEXT[]),
('Basketball Court', 400, 'sports_court', 4500, 
 ARRAY['Open Space', 'Seating', 'Sound Setup Possible'], 
 ARRAY['2025-09-26 09:00-11:00']),
('Classroom Block 101', 40, 'classroom', 900, 
 ARRAY['Projector', 'Whiteboard', 'WiFi'], 
 ARRAY[]::TEXT[]),
('Cafeteria Hall', 500, 'cafeteria', 3000, 
 ARRAY['Seating', 'Food Stalls', 'Sound System'], 
 ARRAY[]::TEXT[]);

-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS facilities_required TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_slot TIME,
ADD COLUMN IF NOT EXISTS computing_requirement TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_group_event BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS number_of_teams INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS evaluation_setup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_category TEXT,
ADD COLUMN IF NOT EXISTS space_type TEXT,
ADD COLUMN IF NOT EXISTS stage_requirement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sound_requirement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stalls_needed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS audience_participation BOOLEAN DEFAULT false;

-- Add check constraint for priority
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_priority_check') THEN
        ALTER TABLE public.events ADD CONSTRAINT events_priority_check CHECK (priority IN ('high', 'medium', 'low'));
    END IF;
END $$;