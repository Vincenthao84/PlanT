import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Clock, Gift } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getRequestType, loadRequest, type StoredRequest } from "@/lib/request-types";

export const Route = createFileRoute("/request/$id")({
  head: () => ({
    meta: [
      { title: "Your request on the map — PLAN T" },
      { name: "description", content: "View your posted request and its location on the map." },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Request not found.</p>
        <Link to="/" className="text-primary underline">Post a new request</Link>
      </div>
    </div>
  ),
  component: RequestPage,
});

function RequestPage() {
  const { id } = Route.useParams();
  const [request, setRequest] = useState<StoredRequest | null | undefined>(undefined);

  useEffect(() => {
    setRequest(loadRequest(id) ?? null);
  }, [id]);

  if (request === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-5xl mx-auto px-6 py-16 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (request === null) {
    throw notFound();
  }

  const type = getRequestType(request.type);
  const Icon = type?.icon ?? MapPin;

  // OpenStreetMap embed — no API key required
  const delta = 0.01;
  const bbox = [
    request.lng - delta,
    request.lat - delta,
    request.lng + delta,
    request.lat + delta,
  ].join("%2C");
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${request.lat}%2C${request.lng}`;
  const fullMapHref = `https://www.openstreetmap.org/?mlat=${request.lat}&mlon=${request.lng}#map=15/${request.lat}/${request.lng}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Post another request
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Map */}
          <Card className="overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="aspect-[4/3] sm:aspect-[16/10] w-full bg-muted">
              <iframe
                title={`Map showing ${request.title}`}
                src={mapSrc}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
            <div className="px-5 py-3 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                {request.locationLabel}
              </span>
              <a
                href={fullMapHref}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Open in maps
              </a>
            </div>
          </Card>

          {/* Details */}
          <div className="space-y-4">
            <Card className="p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="rounded-full">{type?.label ?? "Request"}</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">{request.title}</h1>
              {request.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {request.description}
                </p>
              )}

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Posted just now
                </div>
                {request.reward && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Gift className="h-4 w-4 text-accent" />
                    Reward: <span className="font-semibold">{request.reward}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-secondary/40 border-dashed">
              <p className="text-sm text-muted-foreground">
                Your request is now visible to nearby helpers. They'll bid to fulfill it — you pick the best one.
              </p>
              <Button asChild className="mt-4 w-full rounded-full" variant="outline">
                <Link to="/">Post another request</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
