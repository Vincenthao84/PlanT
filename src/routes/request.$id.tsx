import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, ArrowLeft, Image as ImageIcon, ExternalLink, Send, Camera, X, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import { getRequestType, type StoredRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ExtendedStoredRequest extends StoredRequest {
  createdAt?: string; 
}

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
  
  const [request, setRequest] = useState<ExtendedStoredRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🛠️ Bidding Negotiation state parameters
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [hasAlreadyBid, setHasAlreadyBid] = useState(false);

  // 📸 Single Page Photo Attachment States
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRequestDetails() {
      try {
        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        if (!cancelled && data) {
          const mappedRequest: ExtendedStoredRequest = {
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
            createdAt: data.created_at,
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

    async function checkExistingBid() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("request_bids")
          .select("id")
          .eq("request_id", id)
          .eq("helper_id", user.id)
          .maybeSingle();
        
        if (data && !cancelled) {
          setHasAlreadyBid(true);
        }
      } catch (err) {
        console.error("Error evaluating historical bid check:", err);
      }
    }

    void fetchRequestDetails();
    void checkExistingBid();

    const channel = supabase
      .channel(`request-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${id}` },
        () => {
          void fetchRequestDetails();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id, user]);

  // 📸 Handle Photo Uploads for inline Form (Max 5)
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedUrls.length + files.length > 5) {
      toast.error("You can only upload up to 5 reference photos.");
      return;
    }

    setUploadingPhotos(true);
    const newUrls: string[] = [...uploadedUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id || 'uid'}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `bid-attachments/${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("request-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("request-photos")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }
      setUploadedUrls(newUrls);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photos.");
    } finally {
      setUploadingPhotos(false);
    }
  }

  const removePhoto = (idxToRemove: number) => {
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !request) return;

    if (!bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    setSubmittingBid(true);
    try {
      const { error } = await supabase
        .from("request_bids")
        .insert({
          request_id: request.id,
          helper_id: user.id,
          amount: parseFloat(bidAmount),
          note: bidNote.trim(),
          status: "pending",
          photo_urls: uploadedUrls // ✅ Photo array pushed successfully
        });

      if (error) throw error;

      toast.success("Your negotiation bid has been placed successfully!");
      setHasAlreadyBid(true);
    } catch (err: any) {
      console.error("Error processing insertion into database:", err);
      toast.error(err.message || "Failed to log offer.");
    } finally {
      setSubmittingBid(false);
    }
  }

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

  const mapEmbedUrl = request.lat && request.lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${request.lng - 0.005}%2C${request.lat - 0.003}%2C${request.lng + 0.005}%2C${request.lat + 0.003}&layer=mapnik&marker=${request.lat}%2C${request.lng}`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => void navigate({ to: "/notice-board" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>

        <Card className="p-6 sm:p-8 space-y-6" style={{ boxShadow: "var(--shadow-soft)" }}>
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

          {request.description && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words border-l-2 border-muted pl-4 py-1">
              {request.description}
            </div>
          )}

          {mapEmbedUrl && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Task Geolocation
              </h3>
              <div className="w-full h-48 rounded-xl overflow-hidden border border-border relative bg-muted shadow-sm">
                <iframe
                  title="Task Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={mapEmbedUrl}
                  className="absolute inset-0"
                />
              </div>
            </div>
          )}

          {hasPhotos && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              {request.locationLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Posted {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Recently"}
            </span>
          </div>

          {user && (user.id === request.userId || user.id === request.takenBy) ? (
            <div className="pt-6 border-t border-border">
              <TaskThread
                requestId={request.id}
                currentUserId={user.id}
                requestOwnerId={request.userId}
              />
              
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
            <div className="pt-6 border-t border-border">
              {hasAlreadyBid ? (
                <div className="bg-muted/60 p-4 rounded-xl text-center text-sm text-muted-foreground italic border">
                  You have placed an offer for this request. Check your dashboard profile under "My Placed Bids" to track status or message the requestor.
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10">
                    <h3 className="text-sm font-bold tracking-tight mb-1 text-foreground">Propose a Helper Bid</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Negotiate your pricing and details before acceptance.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Your Required Payment ($)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 25"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="rounded-xl h-10 max-w-[200px]"
                          disabled={submittingBid}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Introduction or Service Note (Optional)
                        </label>
                        <Textarea
                          placeholder="Explain why you are a good match for this request..."
                          value={bidNote}
                          onChange={(e) => setBidNote(e.target.value)}
                          className="rounded-xl min-h-[80px] resize-none"
                          disabled={submittingBid}
                          maxLength={300}
                        />
                      </div>

                      {/* 📸 ADDED: SINGLE PAGE FORM 5-PHOTOS CAPABILITY LAYER */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Bid Reference Attachments ({uploadedUrls.length}/5 max)
                        </label>
                        
                        {uploadedUrls.length > 0 && (
                          <div className="grid grid-cols-5 gap-2 pb-1">
                            {uploadedUrls.map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                                <img src={url} alt="Attachment thumbnail preview" className="object-cover w-full h-full" />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(idx)}
                                  className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black/90 text-white rounded-full p-0.5 border-none transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {uploadedUrls.length < 5 && (
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-medium bg-background hover:bg-muted/50 transition-colors shadow-sm cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handlePhotoUpload}
                              disabled={uploadingPhotos || submittingBid}
                            />
                            {uploadingPhotos ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : (
                              <Camera className="h-3.5 w-3.5 text-accent" />
                            )}
                            {uploadingPhotos ? "Uploading files..." : "Upload Photos"}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      className="rounded-full px-6 gap-2"
                      disabled={submittingBid || uploadingPhotos}
                    >
                      <Send className="h-4 w-4" />
                      {submittingBid ? "Submitting Offer..." : "Submit Proposal Bid"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Please log in to submit a configuration bid or interact with this notice card.
              </p>
            </div>
          )}
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
