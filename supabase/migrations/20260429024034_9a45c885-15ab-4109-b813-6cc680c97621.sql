ALTER TABLE public.requests
  ADD COLUMN taken_by UUID,
  ADD COLUMN taken_at TIMESTAMP WITH TIME ZONE;

CREATE POLICY "Users can take an open request"
ON public.requests
FOR UPDATE
TO authenticated
USING (taken_by IS NULL)
WITH CHECK (taken_by = auth.uid());

CREATE POLICY "Takers can release their taken request"
ON public.requests
FOR UPDATE
TO authenticated
USING (taken_by = auth.uid())
WITH CHECK (taken_by IS NULL OR taken_by = auth.uid());