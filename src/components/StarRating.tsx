import { Star } from "lucide-react";

interface StarRatingProps {
  rating?: number;
}

export function StarRating({ rating = 0 }: StarRatingProps) {
  // If the user has no ratings yet, show a subtle placeholder
  if (rating === 0) {
    return <span className="text-[10px] text-muted-foreground ml-1">(No ratings)</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5" title={`${rating.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? "text-amber-500 fill-amber-500"
              : "text-muted/30 fill-muted/10"
          }`}
        />
      ))}
      <span className="text-[10px] text-muted-foreground font-medium ml-0.5">
        ({rating.toFixed(1)})
      </span>
    </span>
  );
}
