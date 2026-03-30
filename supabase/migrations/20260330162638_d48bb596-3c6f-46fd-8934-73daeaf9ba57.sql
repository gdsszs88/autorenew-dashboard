-- Allow service role (edge functions) to update admin_config
CREATE POLICY "Service role can update config"
ON public.admin_config FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow service role to insert
CREATE POLICY "Service role can insert config"
ON public.admin_config FOR INSERT
WITH CHECK (true);