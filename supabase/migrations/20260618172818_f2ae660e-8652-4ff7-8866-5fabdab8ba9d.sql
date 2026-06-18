
REVOKE EXECUTE ON FUNCTION public.current_retailer_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_order_confirmation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
