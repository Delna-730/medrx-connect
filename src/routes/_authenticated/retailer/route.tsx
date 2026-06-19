import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Pill, ShoppingCart, ClipboardList, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notification-bell";

export const Route = createFileRoute("/_authenticated/retailer")({
  component: RetailerLayout,
});

function RetailerLayout() {
  const { loading, role, retailerStatus, signOut } = useAuth();
  const { count } = useCart();
  const location = useLocation();

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (role === "admin") return <Navigate to="/admin" />;
  if (retailerStatus !== "approved") return <Navigate to="/pending" />;

  const navItems = [
    { to: "/retailer", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/retailer/catalog", label: "Catalog", icon: Pill },
    { to: "/retailer/cart", label: "Cart", icon: ShoppingCart, badge: count },
    { to: "/retailer/orders", label: "My Orders", icon: ClipboardList },
    { to: "/retailer/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r bg-sidebar text-sidebar-foreground md:min-h-screen">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">MedWholesale</div>
            <div className="text-xs text-muted-foreground">Pharmacy portal</div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <Badge className="bg-primary text-primary-foreground">{item.badge}</Badge> : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="p-6 md:p-8">
        <div className="flex justify-end mb-4"><NotificationBell /></div>
        <Outlet />
      </main>
    </div>
  );
}
