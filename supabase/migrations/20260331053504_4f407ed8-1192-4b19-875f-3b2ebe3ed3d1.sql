ALTER TABLE public.admin_config
  ADD COLUMN IF NOT EXISTS tawk_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS qq_qrcode_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_link text NOT NULL DEFAULT '';