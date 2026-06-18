import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Pill, ShieldCheck, Truck, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedWholesale — Wholesale Medicine Ordering for Pharmacies" },
      { name: "description", content: "B2B platform for retail pharmacies to order medicines directly from the wholesale distributor." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role, retailerStatus, loading } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  if (user) {
    if (role === "admin") return <Navigate to="/admin" />;
    if (role === "retailer") {
      if (retailerStatus === "approved") return <Navigate to="/retailer" />;
      return <Navigate to="/pending" />;
    }
    return <Navigate to="/setup" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">MedWholesale</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ tab: "register" }}>Register pharmacy</Link></Button>
          </div>
        </div>
      </header>
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">B2B Pharmacy Platform</span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Wholesale medicine ordering, <span className="text-primary">simplified.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Registered retail pharmacies can browse our catalog, place orders, track delivery, and download GST invoices — all in one secure portal.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild><Link to="/auth" search={{ tab: "register" }}>Register your pharmacy</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/auth">Sign in</Link></Button>
          </div>
        </div>
        <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Verified retailers", body: "Drug license verified before activation." },
            { icon: Pill, title: "Full catalog", body: "Search, filter, and reorder in seconds." },
            { icon: Truck, title: "Live order tracking", body: "From packing to delivery." },
            { icon: BarChart3, title: "GST invoices", body: "Auto-generated, downloadable." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6 text-left">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
