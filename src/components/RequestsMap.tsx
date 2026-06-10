import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
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
  const [googleMaps, setGoogleMaps] = useState<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  // 1. Initialize Google Maps using the NEW Functional API
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set global options first (Required by the new version)
    setOptions({
      apiKey: "", // Add your API key here later if needed
      version: "weekly",
    });

    // Dynamically load the layout engine and marker libraries
    Promise.all([
      importLibrary("maps"),
      importLibrary("marker")
    ])
      .then(([mapsLib, markerLib]) => {
        if (!mapRef.current) return;

        const defaultCenter = requests && requests.length > 0 
          ? { lat: requests[0].lat, lng: requests[0].lng }
          : { lat: 22.3193, lng: 114.1694 };

        const map = new mapsLib.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });

        // Save maps and advanced markers references to local states
        setGoogleMaps({ mapsLib, markerLib });
        infoWindowRef.current = new mapsLib.InfoWindow();
        setMapInstance(map);
        setIsLoaded(true);
      })
      .catch((e) => console.error("Google Maps modern initialization failed:", e));
  }, []);

  // 2. Track user viewport positioning geolocation
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

  // 3. Render Custom Markers dynamically using SVG paths
  useEffect(() => {
    if (!isLoaded || !mapInstance || !googleMaps) return;

    // Clean old markers out
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // User location dot layout configuration
    if (userLoc) {
      const userMarker = new googleMaps.mapsLib.Marker({
        position: userLoc,
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: googleMaps.mapsLib.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      });
      markersRef.current.push(userMarker);
    }

    // Requests dynamic markers placement calculation mapping
    requests.forEach((r) => {
      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      const marker = new googleMaps.mapsLib.Marker({
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
          anchor: new googleMaps.mapsLib.Point(12, 21),
          labelOrigin: new googleMaps.mapsLib.Point(12, 9)
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

  }, [isLoaded, mapInstance, googleMaps, requests, userLoc]);

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
