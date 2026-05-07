-- Room configuration: dimensions + fixture list stored per plan
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS room_config jsonb DEFAULT NULL;
