import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // 1. Safe Client-Side Initialization
  useEffect(() => {
    // Only run this logic on the client
    if (typeof window === "undefined") return;

    const loader = new Loader({
      apiKey: "", // Development mode: leaves this empty
      version: "weekly",
    });

    loader.load().then((google) => {
      if (!mapRef.current) return;
      
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 22.3193, lng: 114.1694 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
      });

      setMapInstance(map);
      setIsLoaded(true);

      // Add markers here...
      requests.forEach((r) => {
        new google.maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map: map,
          title: r.title,
        });
      });
    }).catch((e) => console.error("Map load error:", e));
  }, [requests]);

  // 2. Loading State
  if (!isLoaded) {
    return (
      <div className="w-full h-[480px] bg-muted animate-pulse flex items-center justify-center text-muted-foreground">
        Loading Map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[480px]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
