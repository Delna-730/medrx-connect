import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: AdminOrderDetail,
});

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, retailers(pharmacy_name, owner_name, contact_phone, contact_email, address, city, state, pincode, gst_number)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["admin-order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", id);
      if (error) throw error;
      return data;
    },
  });

  async function updateStatus(status: string) {
    const update: any = { status };
    if (status === "cancelled" && rejectionReason.trim()) {
      update.rejection_reason = rejectionReason.trim();
    }
    const { error } = await supabase.from("orders").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status updated to ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-order", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function updatePayment(payment_status: string) {
    const { error } = await supabase.from("orders").update({ payment_status: payment_status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment status updated");
    qc.invalidateQueries({ queryKey: ["admin-order", id] });
  }

  if (isLoading || !order) return <p className="text-muted-foreground text-sm">Loading…</p>;
  const r: any = order.retailers;

  return (
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4 mr-1" />Back to orders</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{order.status}</Badge>
          <Badge variant="outline">{order.payment_status}</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Retailer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-semibold">{r?.pharmacy_name}</div>
            <div>{r?.owner_name}</div>
            <div className="text-muted-foreground">{r?.contact_email} • {r?.contact_phone}</div>
            <div className="text-muted-foreground">GST: {r?.gst_number}</div>
            <div className="pt-2">{r?.address}, {r?.city}, {r?.state} - {r?.pincode}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Order status</Label>
              <Select value={order.status} onValueChange={updateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Confirming the order will deduct stock automatically.</p>
            </div>
            <div className="space-y-1">
              <Label>Payment status</Label>
              <Select value={order.payment_status} onValueChange={updatePayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rejection reason (when cancelling)</Label>
              <Textarea rows={2} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Optional reason" />
            </div>
          </CardContent>
        </Card>
      </div>

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
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="text-foreground">₹{Number(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>GST</span><span className="text-foreground">₹{Number(order.gst_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Total</span><span>₹{Number(order.total_amount).toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>{order.shipping_address}</div>
          {order.notes && <div className="text-muted-foreground"><span className="font-medium text-foreground">Notes: </span>{order.notes}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
