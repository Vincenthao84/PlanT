import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const navItems = user ? [...publicNav, ...authedExtraNav] : publicNav;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          PLAN&nbsp;T
        </Link>
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
        {user ? (
          <Button variant="outline" className="rounded-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        ) : (
          <Button variant="default" className="rounded-full" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Sparkles className="h-3 w-3" />
          </span>
          PLAN T
        </Link>
        <p>© {new Date().getFullYear()} PLAN T. A platform for offering & asking for help.</p>
      </div>
    </footer>
  );
}