import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Sparkles, LogOut, Menu, User } from "lucide-react"; // Added User icon for visual style
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const publicNav = [
  { to: "/", label: "Make Requests" },
  { to: "/notice-board", label: "Requests Notice Board" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/use-cases", label: "Use cases" },
  { to: "/about", label: "About" },
] as const;

const authedExtraNav = [
  { to: "/my-requests", label: "My Requests" },
  { to: "/my-tasks", label: "My Tasks" },
] as const;

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Extract the display name from Supabase user metadata
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/login" });
  };

  const navItems = user
    ? [
        ...publicNav,
        ...authedExtraNav,
        ...(isAdmin ? ([{ to: "/admin", label: "Admin" }] as const) : []),
      ]
    : publicNav;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <img src="/plant-logo.png" alt="PlanT Logo" className="h-8 w-8 rounded-lg object-cover" />
          PLAN&nbsp;T
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {navItems.map((n) => {
            const highlighted = n.to === "/my-requests" || n.to === "/my-tasks";
            if (highlighted) {
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  activeProps={{
                    className:
                      "bg-primary text-primary-foreground border-primary shadow-sm",
                  }}
                  className="px-3 py-1.5 rounded-full border border-primary/40 text-primary font-medium bg-primary/10 hover:bg-primary/20 transition"
                >
                  {n.label}
                </Link>
              );
            }
            return (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-foreground font-semibold" }}
                className="hover:text-foreground transition"
              >
                {n.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Desktop Username Label */}
              <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted px-3 py-1.5 rounded-full border border-border">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {userName}
              </span>
              
              <Button variant="outline" className="rounded-full hidden sm:inline-flex" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button variant="default" className="rounded-full hidden sm:inline-flex" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-lg">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <img src="/plant-logo.png" alt="PlanT Logo" className="h-7 w-7 rounded-lg object-cover" />
                    PLAN T
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 py-4">
                {navItems.map((n) => {
                  const highlighted = n.to === "/my-requests" || n.to === "/my-tasks";
                  return (
                    <SheetClose asChild key={n.to}>
                      <Link
                        to={n.to}
                        activeOptions={{ exact: true }}
                        activeProps={{
                          className: highlighted
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-foreground font-semibold bg-muted",
                        }}
                        className={
                          highlighted
                            ? "flex items-center rounded-lg px-4 py-3 text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition"
                            : "flex items-center rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        }
                      >
                        {n.label}
                      </Link>
                    </SheetClose>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                  {user ? (
                    <>
                      {/* Mobile User Welcome Badge */}
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Signed in as <span className="font-semibold text-foreground truncate max-w-[140px] ml-1">{userName}</span>
                      </div>
                      
                      <Button variant="outline" className="w-full rounded-full" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <Button variant="default" className="w-full rounded-full" asChild>
                      <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}


export function SiteFooter() {

  return (

    <footer className="border-t border-border py-10">

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">

        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">

          <img src="/plant-logo.png" alt="PlanT Logo" className="h-6 w-6 rounded-md object-cover" />

          PLAN T

        </Link>

        <div className="text-center md:text-right">

          <p>© {new Date().getFullYear()} PLAN T. A platform for offering & asking for help.</p>

          <p className="mt-1 text-xs">Copyright and ideas owned by Zero Point One International Company, Hong Kong.</p>

          <p className="mt-2 text-xs flex flex-wrap items-center justify-center md:justify-end gap-x-3">

            <Link to="/terms" className="font-medium text-primary hover:underline">

              Terms and Conditions

            </Link>

            <span aria-hidden>·</span>

            <Link to="/privacy" className="font-medium text-primary hover:underline">

              Privacy Policy

            </Link>

          </p>

        </div>

      </div>

    </footer>

  );

}
