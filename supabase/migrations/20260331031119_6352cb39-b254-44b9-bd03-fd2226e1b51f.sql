
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'exclusive',
  duration_months integer NOT NULL DEFAULT 1,
  duration_days integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled plans" ON public.plans
  FOR SELECT TO public USING (true);

CREATE POLICY "Service can insert plans" ON public.plans
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Service can update plans" ON public.plans
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete plans" ON public.plans
  FOR DELETE TO public USING (true);

-- Seed default plans
INSERT INTO public.plans (title, category, duration_months, duration_days, price, description, sort_order, featured) VALUES
  ('独享月付', 'exclusive', 1, 30, 25, '带宽独享，速度有保障', 1, false),
  ('独享季付', 'exclusive', 3, 90, 65, '带宽独享，速度有保障', 2, true),
  ('独享年付', 'exclusive', 12, 365, 240, '带宽独享，速度有保障', 3, false),
  ('共享月付', 'shared', 1, 30, 15, '多人共享，价格实惠', 4, false),
  ('共享季付', 'shared', 3, 90, 40, '多人共享，价格实惠', 5, true),
  ('共享年付', 'shared', 12, 365, 150, '多人共享，价格实惠', 6, false);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
