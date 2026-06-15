import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, ArrowLeft, Image as ImageIcon, ExternalLink } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import { getRequestType, type StoredRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/request/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Request Details #${params.id.slice(0, 8)} — PLAN T` },
      { name: "description", content: "View full context, dynamic location information, and image attachments for this request." },
    ],
  }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState<StoredRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRequestDetails() {
      try {
        const { data, error } = await supabase
          .from("requests") // Verified accurate table hook targeting matching database schema
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        if (!cancelled && data) {
          // Explicitly map snake_case postgres properties safely into camelCase properties for components
          const mappedRequest: StoredRequest = {
            id: data.id,
            type: data.type,
            title: data.title,
            description: data.description,
            locationLabel: data.location_label || data.locationLabel || "Pinned location",
            lat: data.lat,
            lng: data.lng,
            reward: data.reward,
            isSecret: data.is_secret || data.isSecret || false,
            userId: data.user_id || data.userId,
            takenBy: data.taken_by || data.takenBy,
            takenAt: data.taken_at || data.takenAt,
            takerCompletedAt: data.taker_completed_at || data.takerCompletedAt,
            completedAt: data.completed_at || data.completedAt,
            feeSettledAt: data.fee_settled_at || data.feeSettledAt,
            photoUrls: data.photo_urls || data.photoUrls || [],
            paymentQrUrl: data.payment_qr_url || data.paymentQrUrl,
          };
          
          setRequest(mappedRequest);
        }
      } catch (err) {
        console.error("Error pulling down request asset details:", err);
        toast.error("Could not load request details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRequestDetails();

    // Active real-time updates piping logic
    const channel = supabase
      .channel(`request-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${id}` },
        () => {
          // Re-fetch clean dataset state if an unexpected database update executes
          void fetchRequestDetails();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Syncing record dependencies…
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-muted-foreground mb-4">Request record not found or has been archived.</p>
        <Button asChild className="rounded-full" variant="outline">
          <Link to="/">Back Home</Link>
        </Button>
      </div>
    );
  }

  const t = getRequestType(request.type);
  const Icon = t?.icon ?? MapPin;
  const hasPhotos = request.photoUrls && request.photoUrls.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => void navigate({ to: ".." })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>

        <Card className="p-6 sm:p-8 space-y-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          {/* Header Metadata block */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {t?.label ?? "Request"}
                  </Badge>
                  {request.isSecret && (
                    <Badge variant="outline" className="rounded-full text-xs bg-muted/40">Anonymous</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight mt-1">{request.title}</h1>
              </div>
            </div>

            {request.reward && (
              <div className="bg-accent/10 text-accent px-4 py-2 rounded-2xl flex items-center gap-1.5 font-semibold text-sm">
                <Gift className="h-4 w-4" />
                {request.reward}
              </div>
            )}
          </div>

          {/* Description details body block */}
          {request.description && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words border-l-2 border-muted pl-4 py-1">
              {request.description}
            </div>
          )}

          {/* 🖼️ IMAGE ATTACHMENTS GALLERY LAYER */}
          {hasPhotos && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1+">
                <ImageIcon className="h-3.5 w-3.5" /> Attached Media ({request.photoUrls.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.photoUrls.map((url, i) => (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block aspect-video rounded-xl overflow-hidden border border-border bg-muted hover:opacity-95 transition-all shadow-sm cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`Attachment reference ${i + 1}`}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Location & Time details metadata strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              {request.locationLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Posted {request.takenAt ? new Date(request.takenAt).toLocaleDateString() : "Recently"}
            </span>
          </div>

          {/* 💬 INTEGRATED CONVERSATION & COMMUNICATIONS MATRIX */}
          {user && (user.id === request.userId || user.id === request.takenBy) ? (
            <div className="pt-6 border-t border-border">
              <TaskThread
                requestId={request.id}
                currentUserId={user.id}
                requestOwnerId={request.userId}
              />
              
              {/* Payment view hooks rendering exclusively for active parties once completion processing kicks off */}
              {(!!request.takerCompletedAt || !!request.completedAt) && request.takenBy && (
                <div className="mt-6 pt-6 border-t border-dashed">
                  <h4 className="text-sm font-semibold mb-3">Settlement & Verification</h4>
                  <PaymentQRUpload
                    requestId={request.id}
                    takerId={request.takenBy}
                    currentUserId={user.id}
                  />
                </div>
              )}
            </div>
          ) : user && !request.takenBy ? (
            <div className="pt-4 flex justify-end">
              <Button className="rounded-full px-6">
                Claim & Accept Task
              </Button>
            </div>
          ) : null}
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
