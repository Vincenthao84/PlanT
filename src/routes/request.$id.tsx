import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Clock, Gift, CheckCircle2, XCircle, User } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import {
  getRequestType,
  fetchRequest,
  deleteRequest,
  listRequestBids,
  acceptBid,
  withdrawBid,
  fetchProfilesByIds,
  type StoredRequest,
  type RequestBid,
} from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { BidDialog } from "@/components/BidDialog";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StoredRequest | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [bids, setBids] = useState<RequestBid[] | null>(null);
  const [requestorName, setRequestorName] = useState<string | null>(null);
  const [actingBidId, setActingBidId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRequest(id)
      .then(async (r) => {
        if (!cancelled) setRequest(r);
        if (r) {
          const profiles = await fetchProfilesByIds([r.userId]).catch(() => ({}));
          if (!cancelled) setRequestorName(profiles[r.userId]?.displayName ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setRequest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reloadBids = async () => {
    try {
      const list = await listRequestBids(id);
      setBids(list);
    } catch {
      setBids([]);
    }
  };

  useEffect(() => {
    if (!user || !request) return;
    void reloadBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, request?.id]);

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

  const isOwner = user?.id === request.userId;
  const myBid = bids?.find((b) => b.helperId === user?.id) ?? null;
  const isAssigned = !!request.takenBy;

  const handleDelete = async () => {
    if (!confirm("Delete this request?")) return;
    setDeleting(true);
    try {
      await deleteRequest(request.id);
      toast.success("Request deleted");
      navigate({ to: "/notice-board" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete";
      toast.error(msg);
      setDeleting(false);
    }
  };

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
                  Posted {timeAgo(request.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  by {requestorName ?? "Anonymous"}
                </div>
                {request.reward && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Gift className="h-4 w-4 text-accent" />
                    Suggested: <span className="font-semibold">{request.reward}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-secondary/40 border-dashed">
              {isOwner ? (
                <p className="text-sm text-muted-foreground">
                  Your request is visible to nearby helpers. Review their bids below and pick one.
                </p>
              ) : isAssigned ? (
                <p className="text-sm text-muted-foreground">
                  This request has already been assigned to a helper.
                </p>
              ) : myBid ? (
                <p className="text-sm text-muted-foreground">
                  You bid <span className="font-semibold text-foreground">{myBid.amount}</span> — status:{" "}
                  <span className="font-medium capitalize">{myBid.status}</span>. The requestor will pick one.
                </p>
              ) : user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Place your bid — set your own price for taking this on.
                  </p>
                  <BidDialog
                    requestId={request.id}
                    suggestedReward={request.reward}
                    onPlaced={reloadBids}
                    trigger={
                      <Button className="w-full rounded-full">Place a bid</Button>
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in to place a bid on this request.
                </p>
              )}
              <Button asChild className="mt-4 w-full rounded-full" variant="outline">
                <Link to="/">Post another request</Link>
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full rounded-full text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete request
                </Button>
              )}
            </Card>

            {(isOwner || myBid) && (
              <Card className="p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                <h2 className="text-lg font-semibold mb-3">
                  Bids {bids ? `(${bids.length})` : ""}
                </h2>
                {bids === null ? (
                  <p className="text-sm text-muted-foreground">Loading bids…</p>
                ) : bids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bids yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {bids.map((b) => {
                      const mine = b.helperId === user?.id;
                      return (
                        <li
                          key={b.id}
                          className="rounded-lg border p-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {b.helperDisplayName ?? "Helper"}
                                {mine && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (you)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {timeAgo(b.createdAt)}
                              </p>
                            </div>
                            <Badge
                              variant={
                                b.status === "accepted"
                                  ? "default"
                                  : b.status === "rejected"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="rounded-full capitalize"
                            >
                              {b.status}
                            </Badge>
                          </div>
                          <div className="text-sm font-semibold">{b.amount}</div>
                          {b.note && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {b.note}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            {isOwner &&
                              !isAssigned &&
                              b.status === "pending" && (
                                <Button
                                  size="sm"
                                  className="rounded-full"
                                  disabled={actingBidId === b.id}
                                  onClick={async () => {
                                    setActingBidId(b.id);
                                    try {
                                      await acceptBid(b.id);
                                      toast.success("Bid accepted — helper assigned.");
                                      const updated = await fetchRequest(id);
                                      setRequest(updated);
                                      await reloadBids();
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error ? err.message : "Could not accept",
                                      );
                                    } finally {
                                      setActingBidId(null);
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Accept this bid
                                </Button>
                              )}
                            {mine && b.status === "pending" && !isAssigned && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full text-destructive hover:text-destructive"
                                disabled={actingBidId === b.id}
                                onClick={async () => {
                                  setActingBidId(b.id);
                                  try {
                                    await withdrawBid(b.id);
                                    toast.success("Bid withdrawn");
                                    await reloadBids();
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : "Could not withdraw",
                                    );
                                  } finally {
                                    setActingBidId(null);
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4" /> Withdraw
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
