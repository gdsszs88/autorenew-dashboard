ALTER TABLE public.admin_config
  ADD COLUMN price_exclusive_month numeric NOT NULL DEFAULT 25,
  ADD COLUMN price_exclusive_quarter numeric NOT NULL DEFAULT 65,
  ADD COLUMN price_exclusive_year numeric NOT NULL DEFAULT 240,
  ADD COLUMN price_shared_month numeric NOT NULL DEFAULT 15,
  ADD COLUMN price_shared_quarter numeric NOT NULL DEFAULT 40,
  ADD COLUMN price_shared_year numeric NOT NULL DEFAULT 150;