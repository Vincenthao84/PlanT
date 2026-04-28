import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getRequestType,
  loadAllRequestsList,
  type StoredRequest,
} from "@/lib/request-types";

export const Route = createFileRoute("/notice-board")({
  head: () => ({
    meta: [
      { title: "Notice board — PLAN T" },
      { name: "description", content: "Browse open requests near you and see them on the map." },
      { property: "og:title", content: "Notice board — PLAN T" },
      { property: "og:description", content: "Browse open requests near you and see them on the map." },
    ],
  }),
  component: NoticeBoardPage,
});

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function parseRewardValue(reward: string | undefined): number {
  if (!reward) return 0;
  // Pull the largest number found in the reward string (handles "$50", "50 USD", "€1,200", "100-200")
  const matches = reward.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!matches) return 0;
  return Math.max(...matches.map(Number));
}

type SortMode = "newest" | "reward";

function NoticeBoardPage() {
  const [requests, setRequests] = useState<StoredRequest[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    setRequests(loadAllRequestsList());
  }, []);

  const sortedRequests = useMemo(() => {
    if (!requests) return null;
    if (sortMode === "reward") {
      return [...requests].sort(
        (a, b) => parseRewardValue(b.reward) - parseRewardValue(a.reward),
      );
    }
    return [...requests].sort((a, b) => b.createdAt - a.createdAt);
  }, [requests, sortMode]);

  const mapSrc = useMemo(() => {
    if (!requests || requests.length === 0) return null;
    const lats = requests.map((r) => r.lat);
    const lngs = requests.map((r) => r.lng);
    const pad = 0.01;
    const minLat = Math.min(...lats) - pad;
    const maxLat = Math.max(...lats) + pad;
    const minLng = Math.min(...lngs) - pad;
    const maxLng = Math.max(...lngs) + pad;
    const bbox = [minLng, minLat, maxLng, maxLat].join("%2C");
    // OSM embed only supports a single marker — use the most recent
    const m = requests[0];
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${m.lat}%2C${m.lng}`;
  }, [requests]);

  const fullMapHref = useMemo(() => {
    if (!requests || requests.length === 0) return null;
    const m = requests[0];
    return `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=13/${m.lat}/${m.lng}`;
  }, [requests]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <Badge variant="secondary" className="rounded-full mb-3">Notice board</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Open requests near you</h1>
            <p className="text-muted-foreground mt-2">
              Browse what people need help with right now. Click a request to see it on the map.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/">Post a new request</Link>
          </Button>
        </div>

        {sortedRequests === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : sortedRequests.length === 0 ? (
          <Card className="p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No requests yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Be the first to post one — it will appear here and on the map.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/">Post a request</Link>
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Showing {sortedRequests.length} request{sortedRequests.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={sortMode}
                  onValueChange={(v) => v && setSortMode(v as SortMode)}
                  variant="outline"
                >
                  <ToggleGroupItem value="newest" aria-label="Sort by newest">
                    <Clock className="h-3 w-3 mr-1" /> Newest
                  </ToggleGroupItem>
                  <ToggleGroupItem value="reward" aria-label="Rank by reward">
                    <Gift className="h-3 w-3 mr-1" /> Highest reward
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            <div className="grid lg:grid-cols-[1fr_420px] gap-6">
            {/* List */}
            <div className="space-y-3">
              {sortedRequests.map((r, idx) => {
                const t = getRequestType(r.type);
                const Icon = t?.icon ?? MapPin;
                const rewardValue = parseRewardValue(r.reward);
                return (
                  <Link
                    key={r.id}
                    to="/request/$id"
                    params={{ id: r.id }}
                    className="block"
                  >
                    <Card
                      className="p-5 hover:border-accent transition-colors"
                      style={{ boxShadow: "var(--shadow-soft)" }}
                    >
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                            <Icon className="h-5 w-5" />
                          </div>
                          {sortMode === "reward" && rewardValue > 0 && (
                            <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="rounded-full text-xs">
                              {t?.label ?? "Request"}
                            </Badge>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> {timeAgo(r.createdAt)}
                            </span>
                          </div>
                          <h3 className="font-semibold leading-tight truncate">{r.title}</h3>
                          {r.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {r.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-accent" />
                              {r.locationLabel}
                            </span>
                            {r.reward && (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Gift className="h-3 w-3 text-accent" />
                                {r.reward}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Map */}
            <div className="lg:sticky lg:top-24 self-start space-y-3">
              <Card className="overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="aspect-square w-full bg-muted">
                  {mapSrc && (
                    <iframe
                      title="Map of open requests"
                      src={mapSrc}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {sortedRequests.length} request{sortedRequests.length === 1 ? "" : "s"} on the map
                  </span>
                  {fullMapHref && (
                    <a
                      href={fullMapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Open full map
                    </a>
                  )}
                </div>
              </Card>
              <p className="text-xs text-muted-foreground px-1">
                Tap a request on the left to view its exact pin and details.
              </p>
            </div>
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
