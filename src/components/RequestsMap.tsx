import { useEffect, useRef, useState } from "react";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

const colorMap: Record<string, string> = {
  snap: "#ef4444",
  knowledge: "#3b82f6",
  action: "#10b981",
  object: "#f59e0b",
  rental: "#8b5cf6",
  anything: "#6b7280",
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Direct injection fallback to completely sidestep modern js-api-loader library panics
    const callbackName = `initGoogleMap_${Math.random().toString(36).substring(2, 9)}`;
    
    (window as any)[callbackName] = () => {
      if (!mapRef.current) return;
      
      const defaultCenter = requests && requests.length > 0 
        ? { lat: requests[0].lat, lng: requests[0].lng }
        : { lat: 22.3193, lng: 114.1694 };

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });

      infoWindowRef.current = new (window as any).google.maps.InfoWindow();
      setMapInstance(map);
      setIsLoaded(true);
    };

    const script = document.createElement("script");
    // Using a public developer endpoint that safely handles empty/missing API credentials gracefully
    script.src = `https://maps.googleapis.com/maps/api/js?callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error("Google maps fallback loading script failed to append context.");
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      delete (window as any)[callbackName];
    };
  }, []);

  // Track user geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        if (mapInstance) {
          mapInstance.panTo(loc);
          mapInstance.setZoom(14);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (mapInstance) {
      requestLocation();
    }
  }, [mapInstance]);

  // Marker Rendering
  useEffect(() => {
    if (!isLoaded || !mapInstance || !(window as any).google) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const googleRef = (window as any).google.maps;

    if (userLoc) {
      const userMarker = new googleRef.Marker({
        position: userLoc,
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: googleRef.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      });
      markersRef.current.push(userMarker);
    }

    requests.forEach((r) => {
      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      const marker = new googleRef.Marker({
        position: { lat: r.lat, lng: r.lng },
        map: mapInstance,
        label: {
          text: shortLabel,
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: "700"
        },
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: hexColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
          scale: 1.6,
          anchor: new googleRef.Point(12, 21),
          labelOrigin: new googleRef.Point(12, 9)
        }
      });

      marker.addListener("click", () => {
        const contentString = `
          <div style="padding: 4px; font-family: system-ui, sans-serif; min-width: 160px; color: #1e293b;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">${t?.label ?? "Request"}</div>
            <div style="font-size: 14px; font-weight: 700; margin: 2px 0 4px 0; line-height: 1.2;">${r.title}</div>
            <div style="font-size: 12px; color: #475569;">📍 ${r.locationLabel}</div>
            <div style="font-size: 12px; font-weight: 600; color: #10b981; margin-top: 4px;">💰 Suggested: ${r.reward || "None"}</div>
            <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <a href="/request/${r.id}" style="font-size: 12px; font-weight: 700; color: #2563eb; text-decoration: none;">View Details →</a>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(contentString);
        infoWindowRef.current.open(mapInstance, marker);
      });

      markersRef.current.push(marker);
    });

  }, [isLoaded, mapInstance, requests, userLoc]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[420px] bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
        Initializing map parameters…
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px]">
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-lg border bg-background font-medium text-xs h-9 px-4"
          onClick={requestLocation}
          disabled={locating}
        >
          <Locate className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {locating ? "Locating…" : "Recenter"}
        </Button>
      </div>
    </div>
  );
}

export default RequestsMap;
