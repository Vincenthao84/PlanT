ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS taker_completed_at timestamp with time zone;