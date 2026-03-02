-- Migración para añadir estado de locales
ALTER TABLE printing_locations 
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Actualizar vista o permisos si es necesario
-- (printing_locations ya es public-read)
