
-- Stock movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  change_amount integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert stock movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_stock_movements_medicine ON public.stock_movements(medicine_id, created_at DESC);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- Trigger: log stock movements automatically when medicines.current_stock changes
CREATE OR REPLACE FUNCTION public.log_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stock IS DISTINCT FROM OLD.current_stock THEN
    INSERT INTO public.stock_movements (medicine_id, change_amount, previous_stock, new_stock, reason, created_by)
    VALUES (
      NEW.id,
      NEW.current_stock - OLD.current_stock,
      OLD.current_stock,
      NEW.current_stock,
      COALESCE(current_setting('app.stock_reason', true), 'manual_adjustment'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_stock_movement
  AFTER UPDATE OF current_stock ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_movement();

-- Trigger: notify retailer when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE retailer_user uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT user_id INTO retailer_user FROM public.retailers WHERE id = NEW.retailer_id;
    IF retailer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (
        retailer_user,
        'Order ' || NEW.order_number || ' ' || NEW.status,
        CASE NEW.status
          WHEN 'confirmed' THEN 'Your order has been confirmed and is being prepared.'
          WHEN 'processing' THEN 'Your order is being processed.'
          WHEN 'shipped' THEN 'Your order has been shipped.'
          WHEN 'delivered' THEN 'Your order has been delivered.'
          WHEN 'cancelled' THEN COALESCE('Order cancelled: ' || NEW.rejection_reason, 'Your order was cancelled.')
          ELSE 'Order status updated to ' || NEW.status
        END,
        '/retailer/orders/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
