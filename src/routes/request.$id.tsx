import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Gift, Clock, ArrowLeft, Image as ImageIcon, Send, Camera, X, Loader2, MessageSquare, Edit2, Trash2, CheckCircle } from "lucide-react";
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
  helper_name?: string;
}

interface ChatMessage {
  id: string;
  request_id: string;
  bid_id?: string | null;
  author_id: string;
  body: string;
  photo_urls: string[];
  created_at: string;
  author_name?: string;
}

export const Route = createFileRoute("/request/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Request Details #${params.id?.slice(0, 8)} — PLAN T` },
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
  
  // Bid actions
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [hasAlreadyBid, setHasAlreadyBid] = useState(false);
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  
  // Request management
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [verifyingCompletion, setVerifyingCompletion] = useState(false);

  // Chat parameters
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMsgText, setNewMsgText] = useState("");
  const [chatPhotos, setChatPhotos] = useState<string[]>([]);
  const [uploadingChatPhotos, setUploadingChatPhotos] = useState(false);

  const [uploadingBidPhotos, setUploadingBidPhotos] = useState(false);
  const [uploadedBidUrls, setUploadedBidUrls] = useState<string[]>([]);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function fetchRequestDetails() {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (data) {
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
        setEditTitle(data.title || "");
        setEditDesc(data.description || "");

        const requestOwnerId = data.user_id || data.userId;
        
        let query = supabase
          .from("request_bids")
          .select("id, helper_id, amount, note, status, photo_urls")
          .eq("request_id", data.id);

        if (user && requestOwnerId !== user.id) {
          query = query.eq("helper_id", user.id);
        }

        const { data: bidsData, error: bidsError } = await query;
        if (bidsError) throw bidsError;

        if (bidsData) {
          const enrichedBids: BidRecord[] = [];
          for (const b of bidsData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", b.helper_id)
              .maybeSingle();

            enrichedBids.push({
              id: b.id,
              helper_id: b.helper_id,
              amount: b.amount,
              note: b.note || "",
              status: b.status,
              photo_urls: b.photo_urls || [],
              helper_name: profile?.display_name || "Helper Offer"
            });
          }
          setBids(enrichedBids);

          if (user && requestOwnerId === user.id && enrichedBids.length > 0 && !selectedBidId) {
            const acceptedBid = enrichedBids.find(b => b.status === "accepted");
            setSelectedBidId(acceptedBid ? acceptedBid.id : enrichedBids[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error loading requests baseline:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkExistingBid() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("request_bids")
          .select("id, amount, note, photo_urls")
          .eq("request_id", id)
          .eq("helper_id", user.id)
          .maybeSingle();

        if (data && !cancelled) {
          setHasAlreadyBid(true);
          setSelectedBidId(data.id);
          setEditingBidId(data.id);
          setBidAmount(data.amount.toString());
          setBidNote(data.note || "");
          setUploadedBidUrls(data.photo_urls || []);
        }
      } catch (err) {
        console.error("Error verifying active bidding indices:", err);
      }
    }

    void fetchRequestDetails();
    void checkExistingBid();

    const channel = supabase
      .channel(`request-detail-room-${id}`)
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

  useEffect(() => {
    if (!user || !request || !selectedBidId) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);

    const fetchChatMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("request_messages")
          .select("id, request_id, bid_id, author_id, body, photo_urls, created_at")
          .eq("request_id", request.id)
          .eq("bid_id", selectedBidId)
          .order("created_at");

        if (error) throw error;

        if (data) {
          const enrichedMessages: ChatMessage[] = [];
          for (const msg of data) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", msg.author_id)
              .maybeSingle();

            enrichedMessages.push({
              id: msg.id,
              request_id: msg.request_id,
              bid_id: msg.bid_id,
              author_id: msg.author_id,
              body: msg.body,
              photo_urls: msg.photo_urls || [],
              created_at: msg.created_at,
              author_name: profile?.display_name || "User"
            });
          }
          setChatMessages(enrichedMessages);
        }
      } catch (err) {
        console.error("Error executing flat message mapping streams:", err);
      } finally {
        setChatLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    };

    void fetchChatMessages();

    const chatChannel = supabase
      .channel(`chat-sandbox-room-${selectedBidId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${request.id}` },
        async (payload) => {
          if (payload.new.bid_id !== selectedBidId) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", payload.new.author_id)
            .maybeSingle();

          const completeMsg: ChatMessage = {
            id: payload.new.id,
            request_id: payload.new.request_id,
            bid_id: payload.new.bid_id,
            author_id: payload.new.author_id,
            body: payload.new.body,
            photo_urls: payload.new.photo_urls || [],
            created_at: payload.new.created_at,
            author_name: profile?.display_name || "User"
          };

          setChatMessages((prev) => [...prev, completeMsg]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chatChannel);
    };
  }, [request, user, selectedBidId]);

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

  async function handleSendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsgText.trim() && chatPhotos.length === 0) return;
    if (!user || !selectedBidId) return;

    try {
      const { error } = await supabase.from("request_messages").insert({
        request_id: request?.id,
        bid_id: selectedBidId,
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

  async function handlePlaceOrUpdateBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !request) return;

    if (!bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) <= 0) {
      toast.error("Please provide a valid bid threshold.");
      return;
    }

    setSubmittingBid(true);
    try {
      if (isEditingBid && editingBidId) {
        const { error } = await supabase
          .from("request_bids")
          .update({
            amount: parseFloat(bidAmount),
            note: bidNote.trim(),
            photo_urls: uploadedBidUrls
          })
          .eq("id", editingBidId);

        if (error) throw error;
        toast.success("Proposal bid updated successfully!");
        setIsEditingBid(false);
      } else {
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
      }
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize offer registry.");
    } finally {
      setSubmittingBid(false);
    }
  }

  async function handleUpdateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!request || updatingRequest) return;
    setUpdatingRequest(true);

    try {
      const { error } = await supabase
        .from("requests")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim(),
        })
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Request modifications saved.");
      setIsEditingRequest(false);
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to update listing configuration.");
    } finally {
      setUpdatingRequest(false);
    }
  }

  async function handleDeleteRequest() {
    if (!request || deletingRequest || !confirm("Are you sure you want to permanently delete this request?")) return;
    setDeletingRequest(true);

    try {
      const { error } = await supabase
        .from("requests")
        .delete()
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Request listing removed successfully.");
      void navigate({ to: "/notice-board" });
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate notice board record.");
    } finally {
      setDeletingRequest(false);
    }
  }

  async function handleVerifyCompletion() {
    if (!request || verifyingCompletion) return;
    setVerifyingCompletion(true);

    try {
      const { error } = await supabase
        .from("requests")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Task completion successfully verified!");
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify completion.");
    } finally {
      setVerifyingCompletion(false);
    }
  }

  async function handleAcceptBid(bid: BidRecord) {
    if (!user || !request || assigningBidId) return;
    setAssigningBidId(bid.id);

    try {
      const { error } = await supabase.rpc("accept_bid", {
        _bid_id: bid.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This helper cannot be assigned; they currently have another active running task!");
          return;
        }
        throw error;
      }

      setBids((prev) =>
        prev.map((b) =>
          b.id === bid.id
            ? { ...b, status: "accepted" }
            : b.status === "pending"
              ? { ...b, status: "rejected" }
              : b
        )
      );

      if (request) {
        setRequest({
          ...request,
          takenBy: bid.helper_id,
          takenAt: new Date().toISOString(),
        });
      }

      toast.success(`Task officially assigned to helper!`);
      void fetchRequestDetails();
    } catch (err: any) {
      console.error("Assignment execution runtime fault:", err);
      toast.error(err.message || "Failed to execute contract commitment changes.");
    } finally {
      setAssigningBidId(null);
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
          
          {/* Top Admin / Edit bar for Owner */}
          {isOwner && !request.takenBy && (
            <div className="flex justify-end gap-2 border-b border-border/40 pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditingRequest(!isEditingRequest)}
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Edit2 className="h-3 w-3" /> {isEditingRequest ? "Cancel Edit" : "Edit Details"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={deletingRequest}
                onClick={() => { void handleDeleteRequest(); }}
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete Post
              </Button>
            </div>
          )}

          {isEditingRequest ? (
            <form onSubmit={handleUpdateRequest} className="space-y-4 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Modify Request Information</h3>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="rounded-xl" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} required className="rounded-xl min-h-[100px]" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit" size="sm" disabled={updatingRequest} className="rounded-full px-4 text-xs">
                  {updatingRequest ? "Saving changes..." : "Save Modifications"}
                </Button>
              </div>
            </form>
          ) : (
            <>
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
                      {request.completedAt && (
                        <Badge variant="default" className="rounded-full text-xs bg-green-600 text-white">Verified Complete</Badge>
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
            </>
          )}

          {/* Requester Verification Completion Banner */}
          {isOwner && request.takerCompletedAt && !request.completedAt && (
            <div className="bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50">
              <div>
                <p className="text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-wider">Helper Completed Task</p>
                <p className="text-xs text-muted-foreground mt-0.5">The assigned companion has completed the task objectives. Please evaluate and verify completion.</p>
              </div>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white rounded-full text-xs shrink-0 gap-1"
                disabled={verifyingCompletion}
                onClick={() => { void handleVerifyCompletion(); }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {verifyingCompletion ? "Verifying..." : "Verify Completion"}
              </Button>
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
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              {request.locationLabel}
            </span> 
            <span suppressHydrationWarning className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> 
              Posted {isMounted && request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Recently"} 
            </span>
          </div>

          {user && (isOwner || hasAlreadyBid) && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  {isOwner ? `Current Proposals (${bids.length})` : "Your Private Proposal Channel"}
                </label>
                
                {/* Helper Edit Bid parameters action trigger */}
                {!isOwner && hasAlreadyBid && !request.takenBy && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingBid(!isEditingBid)}
                    className="rounded-xl h-7 text-[11px]"
                  >
                    {isEditingBid ? "View Private Chat" : "Modify My Proposal Bid"}
                  </Button>
                )}
              </div>

              {isEditingBid ? (
                <form onSubmit={handlePlaceOrUpdateBid} className="space-y-4 p-4 border rounded-xl bg-muted/20">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Edit Your Bid Information</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Required Compensation Reward ($)</label>
                    <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required className="rounded-xl max-w-[200px]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Introduction or Service Note</label>
                    <Textarea value={bidNote} onChange={(e) => setBidNote(e.target.value)} maxLength={300} className="rounded-xl min-h-[80px] text-xs resize-none" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingBid(false)} className="rounded-full text-xs">Cancel</Button>
                    <Button type="submit" size="sm" disabled={submittingBid} className="rounded-full text-xs px-4">
                      {submittingBid ? "Saving bid..." : "Save Bid Changes"}
                    </Button>
                  </div>
                </form>
              ) : bids.length === 0 ? (
                <div className="border border-dashed rounded-xl p-6 text-center text-xs text-muted-foreground italic bg-muted/5">
                  No active bids currently listed for this notice.
                </div>
              ) : (
                <div className="space-y-4">
                  {bids.map((b) => (
                    <div 
                      key={b.id} 
                      onClick={() => setSelectedBidId(b.id)}
                      className={`p-4 border rounded-xl transition-all cursor-pointer space-y-4 ${
                        selectedBidId === b.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{b.helper_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{b.note}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-accent">${b.amount}</span>
                          <span className={`block text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                            b.status === "accepted" ? "text-green-600" : b.status === "rejected" ? "text-red-500" : "text-amber-500"
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      </div>

                      {b.photo_urls && b.photo_urls.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {b.photo_urls.map((pUrl, pIdx) => (
                            <a 
                              key={pIdx} 
                              href={pUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="w-10 h-10 border rounded overflow-hidden flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img src={pUrl} alt="Bid reference" className="object-cover w-full h-full" />
                            </a>
                          ))}
                        </div>
                      )}

                      {selectedBidId === b.id && (
                        <div className="pt-3 border-t border-border/60 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                              Secure Communication Sandbox
                            </h4>
                            {chatLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                          </div>

                          <ScrollArea className="h-52 border rounded-xl p-3 bg-background">
                            <div className="space-y-3">
                              {chatMessages.map((msg) => {
                                const isMe = msg.author_id === user.id;
                                return (
                                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-2.5 text-xs ${
                                      isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                                    }`}>
                                      <p className="font-bold text-[9px] opacity-80 mb-0.5">{msg.author_name}</p>
                                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                      
                                      {msg.photo_urls && msg.photo_urls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                                          {msg.photo_urls.map((img, idx) => (
                                            <a key={idx} href={img} target="_blank" rel="noreferrer" className="rounded overflow-hidden border">
                                              <img src={img} alt="Chat attachment" className="object-cover w-full h-20" />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                                      {isMounted ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                    </span>
                                  </div>
                                );
                              })}
                              <div ref={scrollRef} />
                            </div>
                          </ScrollArea>

                          <form onSubmit={handleSendChatMessage} className="space-y-2">
                            {chatPhotos.length > 0 && (
                              <div className="flex gap-2 p-1.5 border rounded-xl bg-muted/40 flex-wrap">
                                {chatPhotos.map((url, idx) => (
                                  <div key={idx} className="relative w-10 h-10 border rounded overflow-hidden">
                                    <img src={url} alt="Draft" className="object-cover w-full h-full" />
                                    <button
                                      type="button"
                                      onClick={() => setChatPhotos(prev => prev.filter((_, i) => i !== idx))}
                                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                                    >
                                      <X className="h-2 w-2" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2 items-center">
                              <label className="inline-flex h-8 w-8 items-center justify-center border rounded-xl bg-background hover:bg-muted/50 cursor-pointer transition-colors flex-shrink-0 shadow-sm">
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleChatPhotoUpload} disabled={uploadingChatPhotos} />
                                {uploadingChatPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
                              </label>

                              <Input
                                placeholder="Type encrypted contract response..."
                                value={newMsgText}
                                onChange={(e) => setNewMsgText(e.target.value)}
                                className="rounded-xl text-xs h-8"
                              />

                              <Button type="submit" size="icon" className="h-8 w-8 rounded-xl flex-shrink-0" disabled={!newMsgText.trim() && chatPhotos.length === 0}>
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}

                      {isOwner && b.status === "pending" && !request.takenBy && (
                        <div className="mt-3 flex justify-end">
                          <Button 
                            size="sm" 
                            className="rounded-full text-[11px] h-7" 
                            disabled={!!assigningBidId}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAcceptBid(b);
                            }}
                          >
                            {assigningBidId === b.id ? "Assigning..." : "Accept Proposal"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {user && !isOwner && !hasAlreadyBid && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">
                Submit Configuration Proposal
              </h3>
              <form onSubmit={handlePlaceOrUpdateBid} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Your Required Compensation Reward ($)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 25"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="rounded-xl max-w-[200px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Introduction or Service Note
                  </label>
                  <Textarea
                    placeholder="Explain your timeline or offer details..."
                    value={bidNote}
                    onChange={(e) => setBidNote(e.target.value)}
                    className="rounded-xl min-h-[80px] resize-none text-xs"
                    maxLength={300}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bid Document/Reference Photos ({uploadedBidUrls.length}/5)
                  </label>
                  {uploadedBidUrls.length > 0 && (
                    <div className="flex gap-2 pb-1 flex-wrap">
                      {uploadedBidUrls.map((url, idx) => (
                        <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border bg-muted">
                          <img src={url} alt="Thumbnail" className="object-cover w-full h-full" />
                          <button
                            type="button"
                            onClick={() => setUploadedBidUrls(p => p.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 scale-90"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedBidUrls.length < 5 && (
                    <label className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/90 font-medium cursor-pointer bg-accent/5 hover:bg-accent/10 px-3 py-1.5 border border-dashed border-accent/30 rounded-xl transition-all">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleBidPhotoUpload} disabled={uploadingBidPhotos} />
                      {uploadingBidPhotos ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <Camera className="h-3.5 w-3.5 text-accent" />
                      )}
                      {uploadingBidPhotos ? "Uploading..." : "Attach Media"}
                    </label>
                  )}
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

          {user && request.takenBy && (isOwner || user.id === request.takenBy) && (!!request.takerCompletedAt || !!request.completedAt) && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <h4 className="text-xs font-semibold mb-2">Settlement & Verification</h4>
              <PaymentQRUpload requestId={request.id} takerId={request.takenBy} currentUserId={user.id} />
            </div>
          )}

          {!user && (
            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Please log in to submit a configuration bid or communicate with this notice card.
              </p>
            </div>
          )}
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
