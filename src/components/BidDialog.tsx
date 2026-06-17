import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Handshake, Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BidDialogProps {
  requestId: string;
  suggestedReward: string;
  trigger?: React.ReactNode;
  onPlaced?: () => void;
}

export function BidDialog({
  requestId,
  suggestedReward,
  trigger,
  onPlaced,
}: BidDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedReward ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // 📸 Photo Attachment States
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // 🚨 CRITICAL FIX: Completely captures and kills all click/pointer tracking behavior 
  // before the parent elements (like card wrapper links) can react.
  const handleStop = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 📸 Handle Photo Upload Matrix (Max 5)
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedUrls.length + files.length > 5) {
      toast.error("You can only upload a maximum of 5 photos for a proposal bid.");
      return;
    }

    setUploadingPhotos(true);
    const newUrls: string[] = [...uploadedUrls];

    try {
      // Get current authenticated user session data safely
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || "guest";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${currentUserId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `bid-attachments/${requestId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("request-photos") // Adjust to match your real image bucket slug
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("request-photos")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setUploadedUrls(newUrls);
    } catch (err: any) {
      console.error("Storage upload error context:", err);
      toast.error("Failed to upload reference photos.");
    } finally {
      setUploadingPhotos(false);
    }
  }

  // Clear single upload instance
  function removePhoto(e: React.MouseEvent, indexToRemove: number) {
    e.stopPropagation();
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!amount.trim()) {
      toast.error("Enter the price you want for this job.");
      return;
    }

    setSaving(true);
    try {
      // 🛠️ Passing array values down to your storage target via standard Supabase insertions
      const { error } = await supabase
        .from("request_bids")
        .insert({
          request_id: requestId,
          amount: parseFloat(amount.replace(/[^0-9.]/g, "")), // Cleans out '$' symbol formats if typed
          note: note.trim(),
          status: "pending",
          photo_urls: uploadedUrls // ✅ Links photos array safely
        });

      if (error) throw error;

      toast.success("Bid placed. The requestor will review and pick one.");
      setOpen(false);
      setNote("");
      setUploadedUrls([]); // Reset file arrays
      onPlaced?.();
    } catch (err: any) {
      console.error("Bid insertion crash details:", err);
      toast.error(err.message || "Could not place bid");
    } finally {
      setSaving(false);
    }
  };

  return (
    // Explicit pointer/click capture wrapping around components
    <Dialog open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <DialogTrigger asChild onClick={handleStop} onPointerDown={handleStop}>
        {trigger ?? (
          <Button size="sm" className="rounded-full">
            <Handshake className="h-4 w-4" /> Place bid
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent onClick={handleStop} onPointerDown={handleStop}>
        <DialogHeader>
          <DialogTitle>Place your bid</DialogTitle>
          <DialogDescription>
            Tell the requestor what you'd charge to take this on. They'll review all bids and pick one.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bid-amount">Your price</Label>
            <Input
              id="bid-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={suggestedReward || "e.g. $25"}
              autoFocus
            />
            {suggestedReward && (
              <p className="text-xs text-muted-foreground">
                Requestor suggested: <span className="font-medium">{suggestedReward}</span>
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bid-note">Note (optional)</Label>
            <Textarea
              id="bid-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="When you can do it, any questions, why you're a good fit…"
              rows={3}
            />
          </div>

          {/* 📸 ADDED: MULTI-IMAGE UPLOADER INTERFACE */}
          <div className="space-y-2">
            <Label>Bid Attachments ({uploadedUrls.length}/5 max)</Label>
            
            {/* Thumbnail Preview Area */}
            {uploadedUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-1">
                {uploadedUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt="Reference preview" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={(e) => removePhoto(e, idx)}
                      className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black/90 text-white rounded-full p-0.5 border-none transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden Input Upload Button */}
            {uploadedUrls.length < 5 && (
              <div>
                <label 
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-medium bg-background hover:bg-muted/60 transition-colors shadow-sm cursor-pointer mt-1"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos || saving}
                  />
                  {uploadingPhotos ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-accent" />
                  )}
                  {uploadingPhotos ? "Uploading files..." : "Upload Photos"}
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={(e) => { handleStop(e); setOpen(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingPhotos}>
              {saving ? "Sending…" : "Send bid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
