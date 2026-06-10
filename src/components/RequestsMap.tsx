import { useEffect, useRef, useState, useMemo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

// Dynamic Category Marker Config (OKLCH mapping to clean HEX hex values for Google Maps)
const colorMap: Record<string, string> = {
  snap: "#ef4444",      // Red
  knowledge: "#3b82f6", // Blue
  action: "#10b981",    // Emerald
  object: "#f59e0b",    // Amber
  rental: "#8b5cf6",    // Purple
  anything: "#6b7280",  // Gray
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [google, setGoogle] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Initialize Google Maps Loader Safely
  useEffect(() => {
    const loader = new Loader({
      apiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Replace with your key or leave blank for development mode
      version: "weekly",
    });

    loader.load().then((googleInstance) => {
      setGoogle(googleInstance);
    }).catch(err => console.error("Google Maps failed to load", err));
  }, []);

  // 2. Initialize Map Instance
  useEffect(() => {
    if (!google || !mapRef.current || mapInstance) return;

    // Default Fallback Center (Hong Kong/Global fallback match)
    const defaultCenter = requests && requests.length > 0 
      ? { lat: requests[0].lat, lng: requests[0].lng }
      : { lat: 22.3193, lng: 114.1694 };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
      ]
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    setMapInstance(map);
  }, [google, requests]);

  // 3. Handle Auto-Location Fetching
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        if (mapInstance) {
          mapInstance.flyTo ? mapInstance.panTo(loc) : mapInstance.setCenter(loc);
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

  // 4. Render Dynamic Custom Markers & Icons
  useEffect(() => {
    if (!google || !mapInstance) return;

    // Clear old markers completely to prevent memory leaks
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Render Blue User Position Dot if available
    if (userLoc) {
      const userMarker = new google.maps.Marker({
        position: userLoc,
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      });
      markersRef.current.push(userMarker);
    }

    // Render Request Categorized Pin Assets
    requests.forEach((r) => {
      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // Programmatic High-Resolution Pin Drawing
      const marker = new google.maps.Marker({
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
          anchor: new google.maps.Point(12, 21),
          labelOrigin: new google.maps.Point(12, 9)
        }
      });

      // Handle Map Pin Popups flawlessly
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

  }, [google, mapInstance, requests, userLoc]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-muted">
      {/* Target Canvas DOM Element */}
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
      
      {/* Recenter / Geolocation floating action item widget */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-lg border bg-background font-medium text-xs h-9 px-4"
          onClick={requestLocation}
          disabled={locating}
        >
          <Locate className="h-3.5 w-3.5 mr-1.5 text-muted-foreground animate-none" />
          {locating ? "Locating…" : "Recenter"}
        </Button>
      </div>
    </div>
  );
}

export default RequestsMap;
