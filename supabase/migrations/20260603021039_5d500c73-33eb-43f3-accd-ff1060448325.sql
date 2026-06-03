CREATE POLICY "Authenticated users can view open requests"
ON public.requests
FOR SELECT
TO authenticated
USING (completed_at IS NULL);