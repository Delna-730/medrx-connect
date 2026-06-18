import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Pill, Users, LogOut, Tags, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, loading, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (role !== "admin") return <Navigate to="/" />;

  const navItems = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: "Orders", icon: ClipboardList },
    { to: "/admin/medicines", label: "Medicines", icon: Pill },
    { to: "/admin/categories", label: "Categories", icon: Tags },
    { to: "/admin/retailers", label: "Retailers", icon: Users },
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
            <div className="text-xs text-muted-foreground">Admin console</div>
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
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 mt-auto">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
