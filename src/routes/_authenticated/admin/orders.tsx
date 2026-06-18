import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersLayout,
});

function OrdersLayout() {
  const match = useMatchRoute();
  if (match({ to: "/admin/orders/$id" })) return <Outlet />;
  return <AdminOrdersList />;
}

function AdminOrdersList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("*, retailers(pharmacy_name, city)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage incoming retailer orders.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        orders.length === 0 ? <p className="text-muted-foreground text-sm">No orders.</p> :
        <div className="space-y-3">
          {orders.map((o: any) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[240px]">
                    <div className="font-semibold">{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.retailers?.pharmacy_name} • {o.retailers?.city} • {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline">{o.status}</Badge>
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
