import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/retailer/orders")({
  component: OrdersLayout,
});

function OrdersLayout() {
  const match = useMatchRoute();
  const isDetail = match({ to: "/retailer/orders/$id" });
  if (isDetail) return <Outlet />;
  return <OrdersList />;
}

function OrdersList() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: r } = await supabase.from("retailers").select("id").eq("user_id", user!.id).maybeSingle();
      if (!r) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("retailer_id", r.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total</p>
      </div>
      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        orders.length === 0 ? <p className="text-muted-foreground text-sm">No orders yet.</p> :
        <div className="space-y-3">
          {orders.map((o: any) => (
            <Link key={o.id} to="/retailer/orders/$id" params={{ id: o.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <StatusBadge status={o.status} />
                  <Badge variant="outline">{o.payment_status}</Badge>
                  <div className="font-semibold w-28 text-right">₹{Number(o.total_amount).toFixed(2)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      }
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    confirmed: "bg-primary text-primary-foreground",
    processing: "bg-primary text-primary-foreground",
    shipped: "bg-primary text-primary-foreground",
    delivered: "bg-success text-success-foreground",
    cancelled: "bg-destructive text-destructive-foreground",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}
