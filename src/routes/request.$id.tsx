import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Gift, Clock, ArrowLeft, Image as ImageIcon, Send, Camera, X, Loader2, MessageSquare } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
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

interface BidRecord {
  id: string;
  helper_id: string;
  amount: number;
  note: string;
  status: string;
  photo_urls: string[];
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ChatMessage {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  photo_urls: string[];
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [request, setRequest] = useState<ExtendedStoredRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 👥 Bidding & Management States
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [hasAlreadyBid, setHasAlreadyBid] = useState(false);
  const [bids, setBids] = useState<BidRecord[]>([]);

  // 💬 Live Internal Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [newMsgText, setNewMsgText] = useState("");
  const [chatPhotos, setChatPhotos] = useState<string[]>([]);
  const [uploadingChatPhotos, setUploadingChatPhotos] = useState(false);

  // 📸 Bid Attachment Photos State
  const [uploadingBidPhotos, setUploadingBidPhotos] = useState(false);
  const [uploadedBidUrls, setUploadedBidUrls] = useState<string[]>([]);

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

          // Fetch incoming layout bids if owner
          if (user && (data.user_id === user.id || data.userId === user.id)) {
            const { data: bidsData } = await supabase
              .from("request_bids")
              .select(`
                id, helper_id, amount, note, status, photo_urls,
                profiles:helper_id (display_name, avatar_url)
              `)
              .eq("request_id", data.id);
            
            if (bidsData && !cancelled) {
              setBids(bidsData as any[]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading request assets:", err);
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
        console.error("Error inspecting historical bid validation:", err);
      }
    }

    void fetchRequestDetails();
    void checkExistingBid();

    const channel = supabase
      .channel(`request-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${id}` },
        () => { void fetchRequestDetails(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id, user]);

  // 💬 Chat Engine Fetch & Realtime Subscription
  useEffect(() => {
    if (!user || !request) return;

    const isAuthorizedChatter = user.id === request.userId || user.id === request.takenBy || hasAlreadyBid;
    if (!isAuthorizedChatter) {
      setChatLoading(false);
      return;
    }

    const fetchChatMessages = async () => {
      try {
        // FIXED: Streamlined selection string and stripped problematic .order() configuration syntax
        const { data, error } = await supabase
          .from("request_messages")
          .select("id, request_id, author_id, body, photo_urls, created_at, profiles:author_id(display_name, avatar_url)")
          .eq("request_id", request.id)
          .order("created_at");

        if (error) throw error;
        setChatMessages(data as any[] || []);
      } catch (err) {
        console.error("Error loading messages database stream:", err);
      } finally {
        setChatLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    };

    void fetchChatMessages();

    const chatChannel = supabase
      .channel(`chat-room-${request.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${request.id}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", payload.new.author_id)
            .single();

          const completeMsg = {
            ...payload.new,
            profiles: profile || { display_name: "User", avatar_url: null }
          } as ChatMessage;

          setChatMessages((prev) => [...prev, completeMsg]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chatChannel);
    };
  }, [request, user, hasAlreadyBid]);

  // 📸 Action Handler: Uploading Images inside Chat Thread
  async function handleChatPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (chatPhotos.length + files.length > 5) {
      toast.error("Max 5 photos allowed per message.");
      return;
    }

    setUploadingChatPhotos(true);
    const updatedUrls = [...chatPhotos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `chat-attachments/${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("request-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("request-photos")
          .getPublicUrl(filePath);

        updatedUrls.push(publicUrl);
      }
      setChatPhotos(updatedUrls);
      toast.success("Image attached.");
    } catch (err) {
      toast.error("Could not upload chat attachment.");
    } finally {
      setUploadingChatPhotos(false);
    }
  }

  // 📸 Action Handler: Uploading Images for Initial Proposals
  async function handleBidPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedBidUrls.length + files.length > 5) {
      toast.error("You can only attach up to 5 validation photos.");
      return;
    }

    setUploadingBidPhotos(true);
    const newUrls = [...uploadedBidUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}-${i}.${fileExt}`;
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
      setUploadedBidUrls(newUrls);
      toast.success("Photos appended to bid form.");
    } catch (err) {
      toast.error("Failed uploading reference images.");
    } finally {
      setUploadingBidPhotos(false);
    }
  }

  // ✉️ Send message action
  async function handleSendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsgText.trim() && chatPhotos.length === 0) return;
    if (!user) return;

    try {
      const { error } = await supabase.from("request_messages").insert({
        request_id: request?.id,
        author_id: user.id,
        body: newMsgText.trim(),
        photo_urls: chatPhotos
      });

      if (error) throw error;
      setNewMsgText("");
      setChatPhotos([]);
    } catch (err: any) {
      toast.error(err.message || "Could not dispatch message.");
    }
  }

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !request) return;

    if (!bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) <= 0) {
      toast.error("Please provide a valid bid threshold.");
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
          photo_urls: uploadedBidUrls
        });

      if (error) throw error;

      toast.success("Proposal bid submitted successfully!");
      setHasAlreadyBid(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize offer registry.");
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
        <p className="text-muted-foreground mb-4">Request window is not available.</p>
        <Button asChild className="rounded-full" variant="outline">
          <Link to="/">Back Home</Link>
        </Button>
      </div>
    );
  }

  const t = getRequestType(request.type);
  const Icon = t?.icon ?? MapPin;
  const hasPhotos = request.photoUrls && request.photoUrls.length > 0;
  const isOwner = user && user.id === request.userId;
  const showChatLayout = user && (isOwner || user.id === request.takenBy || hasAlreadyBid);

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
                  src={mapEmbedUrl}
                  className="absolute inset-0"
                  frameBorder="0"
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
                    className="group relative block aspect-video rounded-xl overflow-hidden border border-border bg-muted hover:opacity-95 transition-all shadow-sm"
                  >
                    <img src={url} alt="Attachment reference" className="object-cover w-full h-full" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-accent" />{request.locationLabel}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Posted {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Recently"}</span>
          </div>

          {/* 💬 LIVE CHAT PLATFORM CONTAINER */}
          {showChatLayout && (
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex flex-col h-[350px] border rounded-xl bg-card overflow-hidden shadow-inner">
                <div className="px-4 py-2 border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Proposal Chat
                </div>

                <ScrollArea className="flex-1 p-4">
                  {chatLoading ? (
                    <div className="flex items-center justify-center h-full pt-10"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground pt-14">No chat messages sent yet. Ask clarifying questions here.</div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg) => {
                        const isMe = msg.author_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <span className="text-[10px] text-muted-foreground mb-0.5 px-1">{msg.profiles?.display_name || "User"}</span>
                            <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                              {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
                              {msg.photo_urls && msg.photo_urls.length > 0 && (
                                <div className="grid gap-1 mt-1 grid-cols-2">
                                  {msg.photo_urls.map((url, idx) => (
                                    <a href={url} target="_blank" rel="noreferrer" key={idx} className="block rounded border bg-background overflow-hidden w-24 h-16">
                                      <img src={url} className="object-cover w-full h-full" alt="Chat attachment" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={scrollRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Chat Submission Block */}
                <form onSubmit={handleSendChatMessage} className="p-2 bg-background border-t space-y-1.5">
                  {chatPhotos.length > 0 && (
                    <div className="flex gap-1 flex-wrap bg-muted/40 p-1 rounded border border-dashed">
                      {chatPhotos.map((url, idx) => (
                        <div key={idx} className="relative w-10 h-10 rounded overflow-hidden border">
                          <img src={url} className="object-cover w-full h-full" alt="Upload view" />
                          <button type="button" onClick={() => setChatPhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-0 right-0 p-0.5 bg-black/80 text-white rounded-full"><X className="w-2 h-2" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <label className="p-2 hover:bg-secondary border rounded-lg cursor-pointer transition-colors shrink-0">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleChatPhotoUpload} disabled={uploadingChatPhotos || chatLoading} />
                      {uploadingChatPhotos ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
                    </label>
                    <Input value={newMsgText} onChange={(e) => setNewMsgText(e.target.value)} placeholder="Send a fast message..." className="flex-1 h-8 text-xs rounded-lg" disabled={chatLoading} />
                    <Button type="submit" size="sm" className="h-8 px-3 rounded-lg text-xs" disabled={chatLoading || uploadingChatPhotos || (!newMsgText.trim() && chatPhotos.length === 0)}>Send</Button>
                  </div>
                </form>
              </div>

              {isOwner && bids.length > 0 && !request.takenBy && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-primary" /> Current Proposals ({bids.length})</label>
                  <div className="space-y-1.5">
                    {bids.map((b) => (
                      <div key={b.id} className="p-3 border rounded-xl flex items-center justify-between gap-4 bg-muted/20 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{b.profiles?.display_name || "Helper Offer"} — <span className="text-accent">${b.amount}</span></p>
                          {b.note && <p className="text-muted-foreground mt-0.5">{b.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!!request.takerCompletedAt || !!request.completedAt) && request.takenBy && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <h4 className="text-xs font-semibold mb-2">Settlement & Verification</h4>
                  <PaymentQRUpload requestId={request.id} takerId={request.takenBy} currentUserId={user.id} />
                </div>
              )}
            </div>
          )}

          {/* 📬 NEW PROPOSAL SUBMISSION SUBFORM */}
          {user && !isOwner && !request.takenBy && !hasAlreadyBid && (
            <div className="pt-6 border-t border-border">
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10">
                  <h3 className="text-sm font-bold tracking-tight mb-1 text-foreground">Propose a Helper Bid</h3>
                  <p className="text-xs text-muted-foreground mb-4">Negotiate pricing and terms seamlessly directly below.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Required Payment ($)</label>
                      <Input type="number" placeholder="e.g. 25" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="rounded-xl h-10 max-w-[200px]" required />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Introduction or Service Note</label>
                      <Textarea placeholder="Explain your timeline or offer details..." value={bidNote} onChange={(e) => setBidNote(e.target.value)} className="rounded-xl min-h-[80px] resize-none text-xs" maxLength={300} />
                    </div>

                    {/* Bid form photo uploading layer */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bid Document/Reference Photos ({uploadedBidUrls.length}/5)</label>
                      {uploadedBidUrls.length > 0 && (
                        <div className="flex gap-2 pb-1 flex-wrap">
                          {uploadedBidUrls.map((url, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border bg-muted">
                              <img src={url} alt="Thumbnail" className="object-cover w-full h-full" />
                              <button type="button" onClick={() => setUploadedBidUrls(p => p.filter((_, i) => i !== idx))} className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"><X className="h-2 w-2" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {uploadedBidUrls.length < 5 && (
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-medium bg-background hover:bg-muted/50 transition-colors shadow-sm cursor-pointer">
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleBidPhotoUpload} disabled={uploadingBidPhotos} />
                          {uploadingBidPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Camera className="h-3.5 w-3.5 text-accent" />}
                          {uploadingBidPhotos ? "Uploading..." : "Attach Media"}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" className="rounded-full px-6 gap-2 text-xs" disabled={submittingBid || uploadingBidPhotos}>
                    <Send className="h-3.5 w-3.5" />
                    {submittingBid ? "Submitting Offer..." : "Submit Proposal Bid"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {!user && (
            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Please log in to submit a configuration bid or communicate with this notice card.</p>
            </div>
          )}
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
