
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'retailer');
CREATE TYPE public.retailer_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- retailers (pharmacy info, approval workflow)
CREATE TABLE public.retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  gst_number TEXT,
  drug_license_number TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  status public.retailer_status NOT NULL DEFAULT 'pending',
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.retailers TO authenticated;
GRANT ALL ON public.retailers TO service_role;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retailer reads own record" ON public.retailers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Retailer inserts own record" ON public.retailers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Retailer updates own basic info" ON public.retailers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- medicines
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  hsn_code TEXT,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 12,
  batch_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  pack_size TEXT,
  strip_size INTEGER,
  mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock_alert INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_medicines_name ON public.medicines (name);
CREATE INDEX idx_medicines_manufacturer ON public.medicines (manufacturer);
CREATE INDEX idx_medicines_category ON public.medicines (category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
-- Approved retailers and admins can read
CREATE POLICY "Approved users read medicines" ON public.medicines FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.user_id = auth.uid() AND r.status = 'approved')
);
CREATE POLICY "Admin manage medicines" ON public.medicines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_retailers_updated BEFORE UPDATE ON public.retailers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_medicines_updated BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed categories
INSERT INTO public.categories (name, description) VALUES
  ('Antibiotics', 'Antibacterial medications'),
  ('Analgesics', 'Pain relievers'),
  ('Antipyretics', 'Fever reducers'),
  ('Cardiovascular', 'Heart and blood pressure'),
  ('Diabetes', 'Diabetes management'),
  ('Vitamins & Supplements', 'Nutritional supplements'),
  ('Respiratory', 'Asthma, cough, cold'),
  ('Gastrointestinal', 'Digestive system');
