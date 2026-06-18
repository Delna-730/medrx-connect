import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./orders";

export const Route = createFileRoute("/_authenticated/retailer/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", id);
      if (error) throw error;
      return data;
    },
  });

  async function cancelOrder() {
    if (!confirm("Cancel this order?")) return;
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order cancelled");
    qc.invalidateQueries({ queryKey: ["order", id] });
  }

  if (isLoading || !order) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm"><Link to="/retailer/orders"><ArrowLeft className="h-4 w-4 mr-1" />Back to orders</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {order.status === "pending" && (
            <Button variant="outline" size="sm" onClick={cancelOrder}>Cancel order</Button>
          )}
        </div>
      </div>

      {order.rejection_reason && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm">
            <span className="font-medium text-destructive">Rejection reason: </span>{order.rejection_reason}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.medicine_name}</TableCell>
                  <TableCell className="text-right">{i.quantity}</TableCell>
                  <TableCell className="text-right">₹{Number(i.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{i.gst_percent}%</TableCell>
                  <TableCell className="text-right">₹{Number(i.line_total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 space-y-1 text-sm max-w-xs ml-auto">
            <Row k="Subtotal" v={`₹${Number(order.subtotal).toFixed(2)}`} />
            <Row k="GST" v={`₹${Number(order.gst_amount).toFixed(2)}`} />
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total</span><span>₹{Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>{order.shipping_address}</div>
          {order.notes && <div className="text-muted-foreground"><span className="font-medium text-foreground">Notes: </span>{order.notes}</div>}
          <div><span className="text-muted-foreground">Payment status: </span>{order.payment_status}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{k}</span><span className="text-foreground">{v}</span></div>;
}
