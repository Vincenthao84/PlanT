import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Gift, Clock, ArrowLeft, Image as ImageIcon, Send, Camera, X, Loader2, MessageSquare, Edit2, Trash2, CheckCircle, CreditCard, Star, User, Map } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import { StarRating } from "@/components/StarRating";
import { getRequestType, type StoredRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtendedStoredRequest extends StoredRequest {
  createdAt?: string; 
  feeReceivedAt?: string | null;
  photo_urls?: string[]; 
  is_secret?: boolean; // Safeguard property mapping
}

interface BidRecord {
  id: string;
  helper_id: string;
  amount: number;
  note: string;
  status: string;
  photo_urls: string[];
  helper_name?: string;
  averageRating?: number;
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

interface ReviewRecord {
  id: string;
  request_id: string;
  requester_id: string;
  taker_id: string;
  stars: number;
  comment: string;
}

interface OwnerProfile {
  display_name: string | null;
  avatar_url: string | null;
  average_rating?: number;
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
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // History Dialog States
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; userId: string | null; name: string | null }>({ open: false, userId: null, name: null });
  const [bidderHistory, setBidderHistory] = useState<any[]>([]);

  // Bid states
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [hasAlreadyBid, setHasAlreadyBid] = useState(false);
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editReward, setEditReward] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [verifyingCompletion, setVerifyingCompletion] = useState(false);
  const [settlingFee, setSettlingFee] = useState(false);
  const [receivingFee, setReceivingFee] = useState(false);

  // Location & Multi-Image Editing States
  const [editLocationLabel, setEditLocationLabel] = useState("");
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchingMap, setSearchingMap] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [selectedNewFiles, setSelectedNewFiles] = useState<File[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMsgText, setNewMsgText] = useState("");
  const [chatPhotos, setChatPhotos] = useState<string[]>([]);
  const [uploadingChatPhotos, setUploadingChatPhotos] = useState(false);

  const [uploadingBidPhotos, setUploadingBidPhotos] = useState(false);
  const [uploadedBidUrls, setUploadedBidUrls] = useState<string[]>([]);
  
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function fetchBidderHistory(userId: string, name: string) {
    setHistoryDialog({ open: true, userId, name });
    const { data } = await supabase
      .from('request_ratings')
      .select('stars, comment, created_at')
      .eq('taker_id', userId)
      .order('created_at', { ascending: false });
    
    setBidderHistory(data || []);
  }

  async function fetchRequestDetails() {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (data) {
        // Enforce safe parsing from database snake_case naming structures 
        const safeIsSecret = data.is_secret ?? data.isSecret ?? false;

        const mappedRequest: ExtendedStoredRequest = {
          id: data.id,
          type: data.type,
          title: data.title,
          description: data.description,
          locationLabel: data.location_label || data.locationLabel || "Pinned location",
          lat: data.lat,
          lng: data.lng,
          reward: data.reward,
          isSecret: safeIsSecret,
          is_secret: safeIsSecret,
          userId: data.user_id || data.userId,
          takenBy: data.taken_by || data.takenBy,
          takenAt: data.taken_at || data.takenAt,
          takerCompletedAt: data.taker_completed_at || data.takerCompletedAt,
          completedAt: data.completed_at || data.completedAt,
          feeSettledAt: data.fee_settled_at || data.feeSettledAt,
          feeReceivedAt: data.fee_received_at || data.feeReceivedAt || null,
          photo_urls: data.photo_urls || data.photoUrls || [], 
          paymentQrUrl: data.payment_qr_url || data.paymentQrUrl,
          createdAt: data.created_at,
        };
        setRequest(mappedRequest);
        setEditTitle(data.title || "");
        setEditDesc(data.description || "");
        setEditReward(data.reward?.toString() || "0");
        
        setEditLocationLabel(mappedRequest.locationLabel);
        setEditCoords({ lat: data.lat, lng: data.lng });
        setExistingPhotos(mappedRequest.photo_urls || []);

        const realUID = data.user_id || data.userId;

        if (realUID) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", realUID)
            .maybeSingle();
            
          if (profData) {
            setOwnerProfile({
              display_name: profData.display_name || profData.displayName || null,
              avatar_url: profData.avatar_url || profData.avatarUrl || null,
              average_rating: Number(profData.average_rating || profData.averageRating || 0)
            });
          }
        }
        
        let query = supabase
          .from("request_bids")
          .select("id, helper_id, amount, note, status, photo_urls")
          .eq("request_id", data.id);

        if (user && realUID !== user.id) {
          query = query.eq("helper_id", user.id);
        }

        const { data: bidsData, error: bidsError } = await query;
        if (bidsError) throw bidsError;

        if (bidsData) {
          const enrichedBids: BidRecord[] = [];
          for (const b of bidsData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, average_rating")
              .eq("id", b.helper_id)
              .maybeSingle();

            enrichedBids.push({
              id: b.id,
              helper_id: b.helper_id,
              amount: b.amount,
              note: b.note || "",
              status: b.status,
              photo_urls: b.photo_urls || [],
              helper_name: profile?.display_name || `User_${b.helper_id.slice(0, 5)}`,
              averageRating: Number(profile?.average_rating || 0)
            });
          }
          setBids(enrichedBids);

          if (user && realUID === user.id && enrichedBids.length > 0 && !selectedBidId) {
            const acceptedBid = enrichedBids.find(b => b.status === "accepted");
            setSelectedBidId(acceptedBid ? acceptedBid.id : enrichedBids[0].id);
          }
        }

        try {
          const { data: reviewData } = await supabase
            .from("request_ratings")
            .select("id, request_id, requester_id, taker_id, stars, comment")
            .eq("id", data.id);
          if (reviewData) setReviews(reviewData);
        } catch (e) {
          console.warn("Could not load mutual records:", e);
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
        console.error("Error message maps:", err);
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

  const handleShowMapLookup = async () => {
    if (!editLocationLabel.trim()) {
      toast.error("Please enter an address or location name first.");
      return;
    }
    setSearchingMap(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(editLocationLabel)}`,
        { headers: { "Accept-Language": "en", "User-Agent": "PlanT-Notice-Board-App" } }
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data && data[0]) {
        setEditCoords({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        });
        toast.success("Location updated on the preview map window.");
      } else {
        toast.error("Could not trace valid coordinates for this destination text.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during geo map verification lookup.");
    } finally {
      setSearchingMap(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedNewFiles((prev) => [...prev, ...filesArray]);
    }
  };

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
        const filePath = `${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments") 
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(filePath);

        updatedUrls.push(publicUrl);
      }
      setChatPhotos(updatedUrls);
      toast.success("Image attached.");
    } catch (err) {
      console.error(err);
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
          .from("task-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("task-photos")
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

    if (!editTitle.trim() || !editDesc.trim() || !editLocationLabel.trim() || !editReward.trim() || isNaN(Number(editReward))) {
      toast.error("Title, Description, Address, and a valid numeric Reward are required.");
      return;
    }

    setUpdatingRequest(true);

    try {
      const finalPhotoUrls = [...existingPhotos];

      // 1. Process and upload any newly staged file attachments to storage
      if (selectedNewFiles.length > 0) {
        for (const file of selectedNewFiles) {
          const fileExt = file.name.split(".").pop();
          const uniquePath = `request-attachments/${user?.id || "anonymous"}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("task-photos")
            .upload(uniquePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("task-photos")
            .getPublicUrl(uniquePath);

          finalPhotoUrls.push(publicUrl);
        }
      }

      // 2. Safeguard check: ensure task hasn't been accepted by a helper while editing
      const { data: freshRecord, error: fetchError } = await supabase
        .from("requests")
        .select("taken_by")
        .eq("id", request.id)
        .single();

      if (fetchError) throw fetchError;

      if (freshRecord && freshRecord.taken_by !== null) {
        toast.error("This request has already been assigned and can no longer be modified.");
        setIsEditingRequest(false);
        return;
      }

      const targetLat = editCoords?.lat ?? request.lat ?? 48.8566;
      const targetLng = editCoords?.lng ?? request.lng ?? 2.3522;

      // 3. Clean Update Payload
      // We ONLY send core columns to satisfy the check_secret_request_on_update trigger.
      // NO duplicate camelCase properties (like locationLabel or photoUrls) are included.
      const { error } = await supabase
        .from("requests")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim(),
          location_label: editLocationLabel.trim(),
          reward: parseFloat(editReward),
          lat: targetLat,
          lng: targetLng,
          photo_urls: finalPhotoUrls
        })
        .eq("id", request.id);

      if (error) throw error;
      
      toast.success("Request modifications saved.");
      setIsEditingRequest(false);
      setSelectedNewFiles([]);
      void fetchRequestDetails();
    } catch (err: any) {
      console.error("Save failure log details:", err);
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

  async function handleConfirmPaid() {
    if (!request || settlingFee) return;
    setSettlingFee(true);

    try {
      const { error } = await supabase
        .from("requests")
        .update({ fee_settled_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Payment confirmed! Service fee officially settled.");
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to register payment resolution.");
    } finally {
      setSettlingFee(false);
    }
  }

  async function handleConfirmReceipt() {
    if (!request || receivingFee) return;
    setReceivingFee(true);

    try {
      const { error } = await supabase
        .rpc("confirm_fee_receipt", { target_request_id: request.id });

      if (error) throw error;
      toast.success("Payment receipt acknowledged. Funds cleared!");
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to lock receipt verification.");
    } finally {
      setReceivingFee(false);
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
      console.error("Assignment fault:", err);
      toast.error(err.message || "Failed to execute contract commitment changes.");
    } finally {
      setAssigningBidId(null);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !request || submittingReview) return;

    if (!request.takenBy) {
      toast.error("Cannot score an unassigned task workflow.");
      return;
    }

    setSubmittingReview(true);
    try {
      const insertPayload = {
        request_id: request.id,
        requester_id: isOwner ? request.userId : request.takenBy,
        taker_id: isOwner ? request.takenBy : request.userId,
        stars: ratingInput,
        comment: commentInput.trim()
      };

      const { error } = await supabase
        .from("request_ratings")
        .insert(insertPayload);

      if (error) throw error;
      toast.success("Evaluation saved successfully!");
      setCommentInput("");
      void fetchRequestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to save review parameters.");
    } finally {
      setSubmittingReview(false);
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
  const hasPhotos = request.photo_urls && request.photo_urls.length > 0; 
  const isOwner = user && user.id === request.userId;
  const isAssignedHelper = user && user.id === request.takenBy;
  
  const authorLabel = request.isSecret 
    ? "Secret Request" 
    : (ownerProfile?.display_name || `User_${request.userId?.slice(0, 5)}`);

  const mySubmittedReview = reviews.find(r => {
    if (isOwner) {
      return r.requester_id === request.userId && r.taker_id === request.takenBy;
    } else {
      return r.requester_id === request.takenBy && r.taker_id === request.userId;
    }
  });

  const mapEmbedUrl = editCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${editCoords.lng - 0.005}%2C${editCoords.lat - 0.003}%2C${editCoords.lng + 0.005}%2C${editCoords.lat + 0.003}&layer=mapnik&marker=${editCoords.lat}%2C${editCoords.lng}`
    : request.lat && request.lng
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
          {isOwner && !request.takenBy && (
            <div className="flex justify-end gap-2 border-b border-border/40 pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsEditingRequest(!isEditingRequest);
                  if (!isEditingRequest && request) {
                    setEditTitle(request.title || "");
                    setEditDesc(request.description || "");
                    setEditReward(request.reward?.toString() || "0");
                    setEditLocationLabel(request.locationLabel);
                    setEditCoords({ lat: request.lat, lng: request.lng });
                    setExistingPhotos(request.photo_urls || []);
                    setSelectedNewFiles([]);
                  }
                }} 
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Edit2 className="h-3 w-3" />
                {isEditingRequest ? "Cancel Edit" : "Edit Details"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={deletingRequest} 
                onClick={() => { void handleDeleteRequest(); }} 
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete Post
              </Button>
            </div>
          )}

          {isEditingRequest ? (
            <form onSubmit={handleUpdateRequest} className="space-y-4 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Modify Request Information</h3>
              <div>
                <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="rounded-xl" />
              </div>
              <div>
                <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} required className="rounded-xl min-h-[100px]" />
              </div>
              <div>
                <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reward ($)</Label>
                <Input type="number" value={editReward} onChange={(e) => setEditReward(e.target.value)} required className="rounded-xl" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2 border-t border-dashed">
                <div className="space-y-1.5">
                  <Label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Edit Address Label</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editLocationLabel}
                      onChange={(e) => setEditLocationLabel(e.target.value)}
                      placeholder="e.g. London Central Station"
                      className="rounded-xl flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 gap-1 rounded-xl text-xs h-10 px-3"
                      onClick={() => { void handleShowMapLookup(); }}
                      disabled={searchingMap}
                    >
                      {searchingMap ? <Loader2 className="h-3 w-3 animate-spin" /> : <Map className="h-3.5 w-3.5" />}
                      Show Map
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Lookup coordinates through spatial tracking nodes before syncing changes.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Preview Coordinates Area</Label>
                  <div className="aspect-video w-full rounded-xl border bg-muted/30 overflow-hidden relative min-h-[110px]">
                    {mapEmbedUrl ? (
                      <iframe
                        title="Live Position Verification Mapping"
                        width="100%"
                        height="100%"
                        className="border-none absolute inset-0"
                        src={mapEmbedUrl}
                      />
                    ) : (
                      <div className="text-[11px] text-muted-foreground text-center p-4">No coordinates chosen.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-dashed pt-3">
                <Label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Manage Request Imagery</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  
                  <label className="flex flex-col items-center justify-center w-24 h-16 border border-dashed rounded-xl cursor-pointer hover:bg-muted/40 transition-colors border-muted-foreground/30 text-muted-foreground">
                    <ImageIcon className="h-4 w-4 mb-0.5" />
                    <span className="text-[9px] font-semibold">Add Photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  </label>

                  {existingPhotos.map((url, index) => (
                    <div key={`exist-${index}`} className="relative w-24 h-16 rounded-xl overflow-hidden border bg-muted group shadow-sm">
                      <img src={url} alt="Reference Attachment" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== index))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 cursor-pointer transition-colors shadow-md"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}

                  {selectedNewFiles.map((file, index) => (
                    <div key={`new-file-${index}`} className="relative w-24 h-16 rounded-xl overflow-hidden border border-primary/40 bg-muted/60 animate-pulse group">
                      <img src={URL.createObjectURL(file)} alt="Appended cache" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => setSelectedNewFiles(prev => prev.filter((_, idx) => idx !== index))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 cursor-pointer transition-colors shadow-md"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full" 
                  disabled={updatingRequest}
                  onClick={() => {
                    setIsEditingRequest(false);
                    setSelectedNewFiles([]);
                    if (request) {
                      setEditTitle(request.title || "");
                      setEditDesc(request.description || "");
                      setEditReward(request.reward?.toString() || "0");
                      setEditLocationLabel(request.locationLabel);
                      setEditCoords({ lat: request.lat, lng: request.lng });
                      setExistingPhotos(request.photo_urls || []);
                    }
                  }}
                >
                  Cancel
                </Button>
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
                      {request.feeSettledAt && !request.feeReceivedAt && (
                        <Badge variant="default" className="rounded-full text-xs bg-blue-600 text-white">Paid by Requester</Badge>
                      )}
                      {request.feeReceivedAt && (
                        <Badge variant="default" className="rounded-full text-xs bg-purple-600 text-white">Funds Receipt Confirmed</Badge>
                      )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mt-1">{request.title}</h1>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> Posted by: {authorLabel}
                      </span>
                      {!request.isSecret && ownerProfile && (
                        <>
                          <span className="text-muted/60">•</span>
                          <StarRating rating={ownerProfile.average_rating || 0} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {request.reward && (
                  <div className="bg-accent/10 text-accent px-4 py-2 rounded-2xl flex items-center gap-1.5 font-semibold text-sm">
                    <Gift className="h-4 w-4" />
                    ${request.reward}
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

          {!isEditingRequest && hasPhotos && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Attached Imagery / Context
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.photo_urls?.map((url, index) => (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="aspect-video rounded-xl overflow-hidden border border-border/60 bg-muted block group relative"
                  >
                    <img src={url} alt={`Attachment ${index + 1}`} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isEditingRequest && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Fulfill Location Details
              </h4>
              <p className="text-sm font-medium text-foreground px-1">{request.locationLabel}</p>
              
              {mapEmbedUrl && (
                <Card className="p-0 rounded-2xl border bg-muted/20 overflow-hidden relative aspect-[21/9] w-full min-h-[180px]">
                  <iframe
                    title="Dynamic Request Location Grid"
                    width="100%"
                    height="100%"
                    className="border-none absolute inset-0"
                    src={mapEmbedUrl}
                  />
                </Card>
              )}
            </div>
          )}

         {user && (isOwner || isAssignedHelper || (hasAlreadyBid && selectedBidId)) && (
            <div className="border-t border-border/60 pt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Interactions with Helpers</h3>
                    <p className="text-[11px] text-muted-foreground">Chat Box for Details and Logistics</p>
                  </div>
                </div>

                {isOwner && bids.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground px-2">Chat with Bidders:</label>
                    <select 
                      value={selectedBidId || ""} 
                      onChange={(e) => setSelectedBidId(e.target.value)}
                      className="text-xs bg-background border rounded-lg px-2 py-1 outline-none font-medium"
                    >
                      {bids.map(b => (
                        <option key={b.id} value={b.id}>{b.helper_name} (ID: {b.id.slice(0,4)})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-muted/20 border border-border/40 rounded-2xl p-4 flex flex-col h-[320px]">
                  <ScrollArea className="flex-1 pr-3">
                    <div className="space-y-3">
                      {chatLoading ? (
                        <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Gathering secured logs...
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-xs text-muted-foreground italic">
                          No messages recorded in this workflow instance yet.
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.author_id === user.id;
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              <span className="text-[10px] text-muted-foreground px-1 mb-0.5">
                                {msg.author_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className={`p-3 rounded-2xl text-xs max-w-[85%] whitespace-pre-wrap break-words ${
                                isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                              }`}>
                                {msg.body}
                                {msg.photo_urls && msg.photo_urls.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {msg.photo_urls.map((pUrl, pi) => (
                                      <a key={pi} href={pUrl} target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden block bg-black/10 aspect-video">
                                        <img src={pUrl} alt="Chat inline attachment" className="object-cover w-full h-full" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={handleSendChatMessage} className="mt-3 pt-3 border-t border-border/40 space-y-2">
                    {chatPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/50 rounded-xl border border-dashed">
                        {chatPhotos.map((pUrl, pi) => (
                          <div key={pi} className="relative h-10 w-14 rounded-lg overflow-hidden border bg-background group">
                            <img src={pUrl} alt="Preview" className="object-cover w-full h-full" />
                            <button 
                              type="button" 
                              onClick={() => setChatPhotos(prev => prev.filter((_, idx) => idx !== pi))}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className={`cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground hover:text-foreground transition-colors ${uploadingChatPhotos ? "opacity-50 pointer-events-none" : ""}`}>
                        <Camera className="h-4 w-4" />
                        <input type="file" accept="image/*" multiple onChange={handleChatPhotoUpload} className="hidden" disabled={uploadingChatPhotos} />
                      </label>

                      <Input 
                        placeholder={uploadingChatPhotos ? "Uploading file blocks..." : "Type dynamic transaction logs..."}
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        className="rounded-xl h-9 text-xs"
                        disabled={uploadingChatPhotos}
                      />
                      <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0" disabled={uploadingChatPhotos}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="w-full md:w-[220px] space-y-4">
                  <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workflow Progress Block</h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">Task Assigned</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${request.takerCompletedAt ? "bg-green-500" : "bg-muted"}`} />
                        <span className={request.takerCompletedAt ? "text-muted-foreground" : "text-muted-foreground/40"}>Helper Completed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${request.completedAt ? "bg-green-500" : "bg-muted"}`} />
                        <span className={request.completedAt ? "text-muted-foreground" : "text-muted-foreground/40"}>Owner Verified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${request.feeSettledAt ? "bg-green-500" : "bg-muted"}`} />
                        <span className={request.feeSettledAt ? "text-muted-foreground" : "text-muted-foreground/40"}>Funds Dispatched</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${request.feeReceivedAt ? "bg-green-500" : "bg-muted"}`} />
                        <span className={request.feeReceivedAt ? "text-muted-foreground" : "text-muted-foreground/40"}>Funds Receipts Locks</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-2">
                      {isOwner && request.takerCompletedAt && !request.completedAt && (
                        <Button onClick={() => { void handleVerifyCompletion(); }} disabled={verifyingCompletion} className="w-full rounded-xl text-xs font-semibold gap-1.5 bg-green-600 hover:bg-green-700 text-white h-8">
                          {verifyingCompletion ? "Processing..." : "Verify Task Completion"}
                        </Button>
                      )}

                      {isOwner && request.completedAt && !request.feeSettledAt && (
                        <Button onClick={() => { void handleConfirmPaid(); }} disabled={settlingFee} className="w-full rounded-xl text-xs font-semibold gap-1.5 h-8">
                          {settlingFee ? "Processing..." : "Confirm Remittance Paid"}
                        </Button>
                      )}

                      {isAssignedHelper && request.feeSettledAt && !request.feeReceivedAt && (
                        <Button onClick={() => { void handleConfirmReceipt(); }} disabled={receivingFee} className="w-full rounded-xl text-xs font-semibold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white h-8">
                          {receivingFee ? "Processing..." : "Confirm Clear Receipt"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {request.completedAt && (
                    <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent" /> Mutual Service Evaluation
                      </h4>

                      {mySubmittedReview ? (
                        <div className="space-y-1.5 text-xs">
                          <p className="text-[10px] font-bold text-muted-foreground/80 uppercase">Your scores submitted:</p>
                          <StarRating rating={mySubmittedReview.stars} />
                          {mySubmittedReview.comment && (
                            <p className="text-muted-foreground italic bg-background/50 p-2 rounded-xl border border-dashed">
                              "{mySubmittedReview.comment}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitReview} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Star Count</label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button 
                                  key={num} 
                                  type="button" 
                                  onClick={() => setRatingInput(num)}
                                  className="p-0.5 border-none bg-transparent cursor-pointer"
                                >
                                  <Star className={`h-4 w-4 ${num <= ratingInput ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Feedback Text</label>
                            <Textarea 
                              placeholder="Describe your collaborative session indicators..."
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              className="text-xs rounded-xl min-h-[60px]"
                            />
                          </div>

                          <Button type="submit" disabled={submittingReview} className="w-full rounded-xl text-xs h-8">
                            {submittingReview ? "Saving evaluation..." : "Submit Ratings Registry"}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {user && !isOwner && !request.takenBy && (
            <div className="border-t border-dashed pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {hasAlreadyBid ? "Your Active Configuration Bid Proposal" : "Submit Service Execution Bid"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Specify your target cost overhead margins to lock this item card</p>
                </div>
              </div>

              {hasAlreadyBid && !isEditingBid ? (
                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">Proposed Asset Cost Margin:</span>
                    <span className="text-sm font-black text-accent bg-accent/10 px-3 py-1 rounded-xl">${bidAmount}</span>
                  </div>
                  {bidNote && (
                    <div className="text-xs text-muted-foreground bg-background p-2.5 rounded-xl border border-dashed">
                      <span className="font-semibold block text-[10px] uppercase text-muted-foreground/70 mb-1">Proposal Statement parameters:</span>
                      {bidNote}
                    </div>
                  )}
                  {uploadedBidUrls.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Attached Verification Blocks:</span>
                      <div className="flex flex-wrap gap-2">
                        {uploadedBidUrls.map((pUrl, pi) => (
                          <a key={pi} href={pUrl} target="_blank" rel="noreferrer" className="h-12 w-20 rounded-lg overflow-hidden bg-black/5 border block">
                            <img src={pUrl} alt="Bid evidence attachment" className="object-cover w-full h-full" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingBid(true)} className="rounded-xl text-xs h-8 gap-1">
                      <Edit2 className="h-3 w-3" /> Revise Proposal Configuration
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrUpdateBid} className="space-y-4 bg-muted/10 border border-dashed p-4 rounded-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Bidding Amount ($)</label>
                      <Input type="number" placeholder="Value" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required className="rounded-xl h-9 text-xs" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Proposal Notes / Capabilities Overview</label>
                      <Input placeholder="Detail your exact alignment plans, completion timelines, or task specifics..." value={bidNote} onChange={(e) => setBidNote(e.target.value)} className="rounded-xl h-9 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Validation & Reference Attachments (Max 5)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {uploadedBidUrls.map((u, ui) => (
                        <div key={ui} className="relative h-12 w-20 rounded-xl overflow-hidden bg-black/10 border group">
                          <img src={u} alt="Form preview block" className="object-cover w-full h-full" />
                          <button 
                            type="button" 
                            onClick={() => setUploadedBidUrls(prev => prev.filter((_, idx) => idx !== ui))}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {uploadedBidUrls.length < 5 && (
                        <label className={`h-12 w-20 border-2 border-dashed border-muted-foreground/30 hover:border-accent/40 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground cursor-pointer transition-colors ${uploadingBidPhotos ? "opacity-50 pointer-events-none" : ""}`}>
                          {uploadingBidPhotos ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Camera className="h-3.5 w-3.5 text-accent" />
                          )}
                          {uploadingBidPhotos ? "Uploading..." : "Attach Media"}
                          <input type="file" accept="image/*" multiple onChange={handleBidPhotoUpload} className="hidden" disabled={uploadingBidPhotos} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {isEditingBid && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingBid(false)} className="rounded-full text-xs">
                        Cancel Modification
                      </Button>
                    )}
                    <Button type="submit" size="sm" className="rounded-full px-5 gap-2 text-xs" disabled={submittingBid || uploadingBidPhotos}>
                      <Send className="h-3.5 w-3.5" />
                      {submittingBid ? "Submitting Offer..." : isEditingBid ? "Update Proposal Bid" : "Submit Proposal Bid"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {isOwner && !request.takenBy && (
            <div className="border-t border-dashed pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Active Dynamic Bid Proposals Queue</h3>
                  <p className="text-[11px] text-muted-foreground">Select an operational workflow partner matching your specific safety credentials</p>
                </div>
              </div>

              {bids.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-xl text-center border border-dashed">
                  No competitive deployment options have indexed onto this post node yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {bids.map((bid) => (
                    <div key={bid.id} className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-muted-foreground/20 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button 
                            type="button"
                            onClick={() => { void fetchBidderHistory(bid.helper_id, bid.helper_name || "User"); }}
                            className="text-xs font-bold text-foreground hover:underline transition bg-transparent border-none p-0 cursor-pointer text-left"
                          >
                            {bid.helper_name}
                          </button>
                          <span className="text-muted/40">•</span>
                          <StarRating rating={bid.averageRating || 0} />
                          <Badge variant="outline" className="rounded-md text-[10px] px-1 bg-background font-mono text-muted-foreground">
                            ID: {bid.helper_id.slice(0, 5)}
                          </Badge>
                        </div>
                        {bid.note && <p className="text-xs text-muted-foreground break-words italic">"{bid.note}"</p>}
                        
                        {bid.photo_urls && bid.photo_urls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {bid.photo_urls.map((pUrl, pi) => (
                              <a key={pi} href={pUrl} target="_blank" rel="noreferrer" className="h-10 w-16 rounded-lg overflow-hidden border bg-background block">
                                <img src={pUrl} alt="Bid parameter contextual layout" className="object-cover w-full h-full" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-sm font-black text-accent bg-accent/10 px-3 py-1 rounded-xl">${bid.amount}</span>
                        <Button 
                          size="sm" 
                          onClick={() => { void handleAcceptBid(bid); }} 
                          disabled={assigningBidId !== null || bid.status !== "pending"}
                          className="rounded-full px-4 text-xs font-semibold h-8"
                        >
                          {assigningBidId === bid.id ? "Assigning..." : bid.status === "accepted" ? "Assigned" : "Accept Offer"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{historyDialog.name}'s Rating History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {bidderHistory.length > 0 ? (
              bidderHistory.map((h, i) => (
                <div key={i} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <StarRating rating={h.stars} />
                    <span className="text-[11px] text-muted-foreground">
                      {h.created_at ? new Date(h.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {h.comment ? (
                    <p className="text-xs text-foreground mt-1.5 bg-muted/30 p-2 rounded-xl italic">
                      "{h.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 mt-1 italic">No text comment left.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-4">No historical reviews available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </div>
  );
}
