import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PLAN T — A platform for offering and asking for help" },
      { name: "description", content: "PLAN T connects people who need a hand with helpers nearby. Post a request, get bids, and pay only when the deal is done." },
      { name: "author", content: "PLAN T" },
      { property: "og:title", content: "PLAN T — A platform for offering and asking for help" },
      { property: "og:description", content: "PLAN T connects people who need a hand with helpers nearby. Post a request, get bids, and pay only when the deal is done." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "PLAN T — A platform for offering and asking for help" },
      { name: "twitter:description", content: "PLAN T connects people who need a hand with helpers nearby. Post a request, get bids, and pay only when the deal is done." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/11f833e6-1f9f-444e-bc5c-86b805ac347b/id-preview-a3e10763--809ffb92-32ba-4454-8a34-80a23865994c.lovable.app-1777280003933.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/11f833e6-1f9f-444e-bc5c-86b805ac347b/id-preview-a3e10763--809ffb92-32ba-4454-8a34-80a23865994c.lovable.app-1777280003933.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
