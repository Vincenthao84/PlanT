import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const navItems = [
  { to: "/", label: "Request types" },
  { to: "/notice-board", label: "Notice board" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/use-cases", label: "Use cases" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          PLAN&nbsp;T
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground font-semibold" }}
              className="hover:text-foreground transition"
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Button variant="default" className="rounded-full">Get early access</Button>
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