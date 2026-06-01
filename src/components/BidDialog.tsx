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
import { Handshake } from "lucide-react";
import { placeBid } from "@/lib/request-types";
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

  const handleStop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!amount.trim()) {
      toast.error("Enter the price you want for this job.");
      return;
    }
    setSaving(true);
    try {
      await placeBid(requestId, amount.trim(), note.trim());
      toast.success("Bid placed. The requestor will review and pick one.");
      setOpen(false);
      setNote("");
      onPlaced?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place bid");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={handleStop}>
        {trigger ?? (
          <Button size="sm" className="rounded-full" onClick={handleStop}>
            <Handshake className="h-4 w-4" /> Place bid
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onClick={handleStop}>
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Sending…" : "Send bid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}