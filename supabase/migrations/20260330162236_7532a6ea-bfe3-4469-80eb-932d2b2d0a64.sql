-- Create admin_config table to store panel and payment settings
CREATE TABLE public.admin_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:2053',
  panel_user TEXT NOT NULL DEFAULT 'admin',
  panel_pass TEXT NOT NULL DEFAULT '',
  price_month NUMERIC NOT NULL DEFAULT 15,
  price_quarter NUMERIC NOT NULL DEFAULT 40,
  price_year NUMERIC NOT NULL DEFAULT 150,
  hupi_wechat_app_id TEXT DEFAULT '',
  hupi_wechat_app_secret TEXT DEFAULT '',
  hupi_alipay_app_id TEXT DEFAULT '',
  hupi_alipay_app_secret TEXT DEFAULT '',
  hupi_wechat BOOLEAN NOT NULL DEFAULT true,
  hupi_alipay BOOLEAN NOT NULL DEFAULT true,
  crypto_address TEXT DEFAULT '',
  crypto_key TEXT DEFAULT '',
  crypto_usdt BOOLEAN NOT NULL DEFAULT true,
  crypto_trx BOOLEAN NOT NULL DEFAULT true,
  admin_password_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Public can read non-sensitive pricing config
CREATE POLICY "Public can read pricing config"
ON public.admin_config FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_config_updated_at
BEFORE UPDATE ON public.admin_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.admin_config (admin_password_hash) VALUES ('admin123');