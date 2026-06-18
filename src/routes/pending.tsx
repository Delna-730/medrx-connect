import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Clock, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const { user, role, retailerStatus, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role === "admin") return <Navigate to="/admin" />;
  if (retailerStatus === "approved") return <Navigate to="/retailer" />;

  const rejected = retailerStatus === "rejected";
  const Icon = rejected ? XCircle : Clock;

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${rejected ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}`}>
            <Icon className="h-7 w-7" />
          </div>
          <CardTitle className="mt-4">
            {rejected ? "Registration rejected" : "Awaiting approval"}
          </CardTitle>
          <CardDescription>
            {rejected
              ? "Your pharmacy registration was rejected. Please contact support for more information."
              : "Your pharmacy registration has been submitted. An admin will review and activate your account shortly."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
