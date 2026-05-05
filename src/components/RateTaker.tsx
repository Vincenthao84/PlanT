import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  requestId: string;
  requesterId: string;
  takerId: string;
};

type Rating = {
  stars: number;
  comment: string;
};

export function RateTaker({ requestId, requesterId, takerId }: Props) {
  const [existing, setExisting] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("request_ratings")
      .select("stars, comment")
      .eq("request_id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setExisting({ stars: data.stars, comment: data.comment });
          setStars(data.stars);
          setComment(data.comment);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const submit = async () => {
    if (stars < 1) {
      toast.error("Please select a star rating");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("request_ratings")
      .upsert(
        {
          request_id: requestId,
          requester_id: requesterId,
          taker_id: takerId,
          stars,
          comment,
        },
        { onConflict: "request_id" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setExisting({ stars, comment });
    setEditing(false);
    toast.success("Rating saved");
  };

  if (loading) return null;

  const display = hover || stars;

  if (existing && !editing) {
    return (
      <div className="mt-4 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your rating</p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "h-5 w-5",
                    n <= existing.stars ? "fill-accent text-accent" : "text-muted-foreground/40",
                  )}
                />
              ))}
            </div>
            {existing.comment && (
              <p className="text-sm text-muted-foreground mt-2">{existing.comment}</p>
            )}
          </div>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Rate the task taker</p>
      <div className="flex items-center gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            className="p-1 -m-1"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                n <= display ? "fill-accent text-accent" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a short comment (optional)"
        className="mt-3"
        rows={2}
      />
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="rounded-full" disabled={saving} onClick={submit}>
          {saving ? "Saving…" : existing ? "Update rating" : "Submit rating"}
        </Button>
        {existing && (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setStars(existing.stars);
              setComment(existing.comment);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}