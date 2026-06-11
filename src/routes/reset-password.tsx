import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
/
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password — PLAN T" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Optional security check: If auth finishes loading and there's no user session 
  // (meaning they didn't come from a valid email link), kick them back to login.
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Invalid or expired session. Please request a new reset link.");
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully! Welcome back.");
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-xl border-border/60">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please enter your new password below.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
