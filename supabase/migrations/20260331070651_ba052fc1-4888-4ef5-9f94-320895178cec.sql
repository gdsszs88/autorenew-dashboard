ALTER TABLE public.admin_config ADD COLUMN IF NOT EXISTS resend_api_key text DEFAULT '' NOT NULL;
ALTER TABLE public.admin_config ADD COLUMN IF NOT EXISTS notify_email text DEFAULT '' NOT NULL;