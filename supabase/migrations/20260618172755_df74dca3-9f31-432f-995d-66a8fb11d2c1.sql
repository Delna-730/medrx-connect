
-- Enums
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','partial','paid');

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,8)),
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_address TEXT,
  notes TEXT,
  rejection_reason TEXT,
  placed_by UUID NOT NULL REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_retailer ON public.orders(retailer_id);
CREATE INDEX idx_orders_status ON public.orders(status);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Helper: get retailer id for current user
CREATE OR REPLACE FUNCTION public.current_retailer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.retailers WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS: retailers see their own orders; admins see all
CREATE POLICY "Retailers view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (retailer_id = public.current_retailer_id() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Retailers create own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (retailer_id = public.current_retailer_id() AND placed_by = auth.uid());

CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Retailers cancel own pending orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (retailer_id = public.current_retailer_id() AND status = 'pending')
  WITH CHECK (retailer_id = public.current_retailer_id());

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View items of accessible orders" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.retailer_id = public.current_retailer_id() OR public.has_role(auth.uid(),'admin'))
  ));

CREATE POLICY "Insert items into own pending orders" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.retailer_id = public.current_retailer_id()
      AND o.status = 'pending'
  ));

-- Stock decrement when admin confirms order
CREATE OR REPLACE FUNCTION public.handle_order_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    FOR item IN SELECT medicine_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      UPDATE public.medicines
        SET current_stock = current_stock - item.quantity
      WHERE id = item.medicine_id;
      IF (SELECT current_stock FROM public.medicines WHERE id = item.medicine_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for medicine %', item.medicine_id;
      END IF;
    END LOOP;
    NEW.processed_at := now();
    NEW.processed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_confirm_stock
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_confirmation();
