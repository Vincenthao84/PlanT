import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox, CheckCircle2, Handshake, List, Map as MapIcon, User, Layers } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BidDialog } from "@/components/BidDialog";
import {
  getRequestType,
  fetchAllRequests,
  fetchProfilesByIds,
  type StoredRequest,
} from "@/lib/request-types";

const RequestsMap = lazy(() =>
  import("@/components/RequestsMap").then((m) => ({ default: m.RequestsMap })),
);

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
  const matches = reward.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!matches) return 0;
  return Math.max(...matches.map(Number));
}

type SortMode = "newest" | "reward";
type ViewMode = "list" | "map" | "all";

function NoticeBoardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StoredRequest[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [profiles, setProfiles] = useState<Record<string, { displayName: string | null; avatarUrl: string | null }>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (viewMode === "map") {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Fetch requests and user's current geolocation
  useEffect(() => {
    let cancelled = false;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        (error) => {
          console.warn("Notice Board coordinate filtering fallback activated:", error);
        }
      );
    }

    fetchAllRequests()
      .then(async (rs) => {
        if (!cancelled) setRequests(rs);
        const map = await fetchProfilesByIds(rs.map((r) => r.userId)).catch(() => ({}));
        if (!cancelled) setProfiles(map);
      })
      .catch((err) => {
        console.error("Failed to collect request assets:", err);
        if (!cancelled) setRequests([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter and sort the requests
  const filteredAndSortedRequests = useMemo(() => {
    if (!requests) return null;

    let result = [...requests];

    if (viewMode !== "all") {
      result = result.filter((r: any) => {
        let lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
        let lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
        
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return false;
        if (!userLocation) return true;

        const latDiff = Math.abs(lat - userLocation.lat);
        const lngDiff = Math.abs(lng - userLocation.lng);

        return latDiff <= 1.0 && lngDiff <= 1.0;
      });
    } else {
      result = result.filter((r: any) => {
        let lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
        let lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
        return !(isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0));
      });
    }

    if (sortMode === "reward") {
      return result.sort((a, b) => parseRewardValue(b.reward) - parseRewardValue(a.reward));
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [requests, sortMode, userLocation, viewMode]);

  const fullMapHref = useMemo(() => {
    if (!filteredAndSortedRequests || filteredAndSortedRequests.length === 0) return null;
    const m = filteredAndSortedRequests[0];
    return `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=13/${m.lat}/${m.lng}`;
  }, [filteredAndSortedRequests]);

  const handleNotSignedInBid = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.error("Please sign in to place a bid.");
  };

  const renderRequestCard = (r: StoredRequest, idx: number) => {
    const t = getRequestType(r.type);
    const Icon = t?.icon ?? MapPin;
    const rewardValue = parseRewardValue(r.reward);
    const isTaken = !!r.takenBy;
    const takenByMe = !!user && r.takenBy === user.id;
    const isOwner = !!user && r.userId === user.id;

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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className="rounded-full text-xs">
                  {t?.label ?? "Request"}
                </Badge>
                {isTaken && (
                  <Badge className="rounded-full text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {takenByMe ? "Assigned to you" : "Assigned"}
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {timeAgo(r.createdAt)}
                </span>
              </div>
              
              <h3 className="font-semibold leading-tight text-base md:text-lg break-words whitespace-normal line-clamp-2 md:line-clamp-none">
                {r.title}
              </h3>
              
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                by {r.isSecret ? "Secret Request" : (profiles[r.userId]?.displayName ?? "Anonymous")}
              </p>
              {r.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {r.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                  <MapPin className="h-3 w-3 text-accent shrink-0" />
                  <span className="truncate">{r.locationLabel}</span>
                </span>
                {r.reward && (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground shrink-0">
                    <Gift className="h-3 w-3 text-accent" />
                    Suggested: {r.reward}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 self-center pl-1">
              {isTaken ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full pointer-events-none"
                  disabled
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {takenByMe ? "Assigned" : "Assigned"}
                </Button>
              ) : isOwner ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full pointer-events-none"
                  disabled
                >
                  Your request
                </Button>
              ) : !user ? (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleNotSignedInBid}
                >
                  <Handshake className="h-4 w-4" /> Place bid
                </Button>
              ) : (
                <BidDialog
                  requestId={r.id}
                  suggestedReward={r.reward}
                />
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <Badge variant="secondary" className="rounded-full mb-3">Notice board</Badge>
            <h1 className="text-4xl font-bold tracking-tight">
              {viewMode === "all" ? "All Global Requests" : "Open requests near you"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {viewMode === "all" 
                ? "Browsing every request on the platform regardless of distance."
                : "Browse what people need help with right now. Click a request to see it on the map."}
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/">Post a new request</Link>
          </Button>
        </div>

        {filteredAndSortedRequests === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filteredAndSortedRequests.length === 0 ? (
          <Card className="p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No requests found</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              There are no active requests matching this section criteria right now.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/">Post a request</Link>
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Showing {filteredAndSortedRequests.length} {viewMode === "all" ? "global" : "nearby"} request{filteredAndSortedRequests.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={viewMode}
                  onValueChange={(v) => v && setViewMode(v as ViewMode)}
                  variant="outline"
                >
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-3 w-3 mr-1" /> List
                  </ToggleGroupItem>
                  <ToggleGroupItem value="map" aria-label="Map view">
                    <MapIcon className="h-3 w-3 mr-1" /> Nearby map
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label="List all view">
                    <Layers className="h-3 w-3 mr-1" /> List All
                  </ToggleGroupItem>
                </ToggleGroup>

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

            {viewMode === "all" ? (
              <div className="space-y-3 max-w-4xl">
                {filteredAndSortedRequests.map((r, idx) => renderRequestCard(r, idx))}
              </div>
            ) : viewMode === "map" ? (
              <div className="space-y-6">
                <div className="w-full block relative h-[500px] rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                  <Suspense
                    fallback={
                      <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                        Loading Map View...
                      </div>
                    }
                  >
                    <RequestsMap requests={filteredAndSortedRequests} />
                  </Suspense>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight px-1">Nearby Requests Feed</h2>
                  {filteredAndSortedRequests.map((r, idx) => renderRequestCard(r, idx))}
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
                <div className="space-y-3">
                  {filteredAndSortedRequests.map((r, idx) => renderRequestCard(r, idx))}
                </div>

                {isLargeScreen && (
                  <div className="hidden lg:block lg:sticky lg:top-24 self-start space-y-3 w-full">
                    <Card className="overflow-hidden p-0 h-[420px] relative w-full flex flex-col" style={{ boxShadow: "var(--shadow-soft)" }}>
                      <div className="flex-1 w-full h-full relative min-h-0">
                        <Suspense
                          fallback={
                            <div className="w-full h-full bg-muted flex items-center justify-center text-sm animate-pulse">
                              Loading Map...
                            </div>
                          }
                        >
                          <RequestsMap requests={filteredAndSortedRequests} />
                        </Suspense>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between text-sm border-t bg-background shrink-0">
                        <span className="text-muted-foreground">
                          {filteredAndSortedRequests.length} request{filteredAndSortedRequests.length === 1 ? "" : "s"} on the map
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
                )}
              </div>
            )}
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
