
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid text NOT NULL,
  email text,
  plan_name text NOT NULL,
  months integer NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CNY',
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trade_no text,
  crypto_amount numeric,
  crypto_currency text,
  tx_hash text,
  notify_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read own orders by uuid" ON public.orders
  FOR SELECT TO public USING (true);

CREATE POLICY "Service can insert orders" ON public.orders
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Service can update orders" ON public.orders
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();
