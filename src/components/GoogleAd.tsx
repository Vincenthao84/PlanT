import { useEffect } from "react";

interface GoogleAdProps {
  slot: string; // The unique ID for this specific ad unit from your dashboard
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  responsive?: "true" | "false";
  className?: string;
}

export function GoogleAd({ 
  slot, 
  format = "auto", 
  responsive = "true", 
  className = "" 
}: GoogleAdProps) {
  
  useEffect(() => {
    try {
      // Pushes the ad initialization instruction to the global window array
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense initialization error: ", error);
    }
  }, [slot]); // Re-runs layout hooks strictly if the slot context changes

  return (
    <div className={`w-full overflow-hidden my-6 flex justify-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-6360097975265112" // 👈 Replace with your actual Publisher ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
