import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Initialize Map Canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm": { 
            type: "raster", 
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
            tileSize: 256,
            attribution: "© OpenStreetMap"
          } 
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [114.1694, 22.3193], // HK Default
      zoom: 11,
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    map.on("load", () => {
      setIsMapReady(true);
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  // 2. Extract and Plot Pins with Strict Lovable Fallbacks
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !requests) return;

    // Clear older tracking elements
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filter out any invalid items
    const validRequests = requests.filter(Boolean);
    if (validRequests.length === 0) return;

    // We collect valid coordinates to fit bounds if needed
    const bounds = new maplibregl.LngLatBounds();
    let validCoordinatesCount = 0;

    validRequests.forEach((r: any) => {
      // LOVABLE DATA EXTRACTION LAYER
      // Check for 'lng'/'lat', then 'longitude'/'latitude', then nested coordinates fields
      let rawLng = r.lng ?? r.longitude ?? r.coordinates?.lng ?? r.coordinates?.longitude ?? r.location?.lng;
      let rawLat = r.lat ?? r.latitude ?? r.coordinates?.lat ?? r.coordinates?.latitude ?? r.location?.lat;

      // Force conversion from string formats to structural float calculations
      const lng = parseFloat(String(rawLng));
      const lat = parseFloat(String(rawLat));

      // Direct fallback backup: If still invalid, do not drop pin
      if (isNaN(lng) || isNaN(lat)) {
        console.warn("Skipping pin rendering due to untranslatable Lovable coordinates structure:", r);
        return;
      }

      validCoordinatesCount++;
      bounds.extend([lng, lat]);

      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // HTML DOM marker element construction overrides
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "block";
      el.style.cursor = "pointer";
      el.style.zIndex = "9999";

      // Native SVG Dynamic UI injection
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" style="display: block; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4)); pointer-events: none;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${shortLabel}</text>
        </svg>
      `;

      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; width: 160px; color: #1e293b; line-height: 1.4;">
          <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
          <div style="font-size: 13px; font-weight: 700; margin: 1px 0; color: #0f172a; line-height: 1.2;">${r.title || "Untitled"}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">📍 ${r.locationLabel || "Location"}</div>
          ${r.reward ? `<div style="font-size: 11px; font-weight: 600; color: #10b981;">💰 ${r.reward}</div>` : ""}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -10], closeButton: false })
        .setHTML(popupContent);

      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // 3. Smart Camera Focus Adjustment
    if (validCoordinatesCount > 0) {
      if (validRequests.length === 1) {
        // Single Request Page View focus point snap
        const singleLng = parseFloat(String(validRequests[0].lng ?? validRequests[0].longitude));
        const singleLat = parseFloat(String(validRequests[0].lat ?? validRequests[0].latitude));
        if (!isNaN(singleLng) && !isNaN(singleLat)) {
          mapRef.current.setCenter([singleLng, singleLat]);
          mapRef.current.setZoom(14);
        }
      } else {
        // Notice Board multi-pin bounds fitting layout auto focus snap
        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 800 });
      }
    }
  }, [isMapReady, requests]);

  return (
    <div className="w-full h-full min-h-[400px] relative bg-muted/20">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;
