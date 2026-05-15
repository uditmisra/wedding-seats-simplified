-- Capture arbitrary extra columns from imported spreadsheets without losing
-- information. The AI extracts core fields into typed columns and stashes
-- everything else (phone, address, table preference, dish choice, etc.) as
-- string-keyed values in metadata.
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
