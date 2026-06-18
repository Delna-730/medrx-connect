import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/retailer/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, gstAmount, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: retailer } = useQuery({
    queryKey: ["retailer-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("retailers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      if (data && !shippingAddress) {
        setShippingAddress(`${data.address}, ${data.city}, ${data.state} - ${data.pincode}`);
      }
      return data;
    },
  });

  async function placeOrder() {
    if (!retailer || !user) return;
    if (items.length === 0) return toast.error("Cart is empty");
    if (!shippingAddress.trim()) return toast.error("Shipping address required");

    setSubmitting(true);
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          retailer_id: retailer.id,
          placed_by: user.id,
          subtotal,
          gst_amount: gstAmount,
          total_amount: total,
          shipping_address: shippingAddress,
          notes: notes || null,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Insert items
      const itemRows = items.map((i) => ({
        order_id: order.id,
        medicine_id: i.medicine_id,
        medicine_name: i.name,
        quantity: i.quantity,
        unit_price: i.wholesale_price,
        gst_percent: i.gst_percent,
        line_total: i.wholesale_price * i.quantity * (1 + Number(i.gst_percent) / 100),
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      clear();
      toast.success(`Order ${order.order_number} placed!`);
      navigate({ to: "/retailer/orders/$id", params: { id: order.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Browse the catalog to add medicines.</p>
        <Button asChild><Link to="/retailer/catalog">Go to catalog</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-muted-foreground">{items.length} item(s)</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {items.map((i) => (
            <Card key={i.medicine_id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.manufacturer} • {i.pack_size ?? ""}</div>
                  <div className="text-sm mt-1">₹{i.wholesale_price.toFixed(2)} × {i.quantity} <span className="text-muted-foreground">+ {i.gst_percent}% GST</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => setQty(i.medicine_id, i.quantity - 1)} disabled={i.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                  <Input className="w-16 text-center" type="number" min={1} max={i.current_stock} value={i.quantity} onChange={(e) => setQty(i.medicine_id, parseInt(e.target.value) || 1)} />
                  <Button size="icon" variant="outline" onClick={() => setQty(i.medicine_id, i.quantity + 1)} disabled={i.quantity >= i.current_stock}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="w-24 text-right font-semibold">
                  ₹{(i.wholesale_price * i.quantity * (1 + Number(i.gst_percent) / 100)).toFixed(2)}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(i.medicine_id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shipping address</Label>
              <Textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1 text-sm border-t pt-3">
              <Row k="Subtotal" v={`₹${subtotal.toFixed(2)}`} />
              <Row k="GST" v={`₹${gstAmount.toFixed(2)}`} />
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full" disabled={submitting} onClick={placeOrder}>
              {submitting ? "Placing…" : "Place order"}
            </Button>
            <Button variant="outline" className="w-full" onClick={clear}>Clear cart</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{k}</span><span className="text-foreground">{v}</span></div>;
}
