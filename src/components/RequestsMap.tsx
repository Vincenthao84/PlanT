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

  // 1. Initialize Map Canvas Globally
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
            attribution: "© OpenStreetMap contributors"
          } 
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [0, 20], 
      zoom: 1,        
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

  // 2. Parse Data payloads and Render Pins
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !requests) return;

    requestAnimationFrame(() => {
      if (!mapRef.current) return;

      // Wipe active tracking elements from canvas
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let activePinsCount = 0;

      // Print data structure to the console to see what Lovable is returning
      console.log("DEBUG MAP PAYLOADS:", requests);

      requests.forEach((r: any) => {
        if (!r) return;

        // Extract values from various possible formats
        let rawLat = r.lat ?? r.latitude ?? r.coordinates?.lat;
        let rawLng = r.lng ?? r.longitude ?? r.coordinates?.lng;

        // Clean up strings if Lovable saved them with commas, spaces, or extra characters
        let lat = parseFloat(String(rawLat).replace(/[^\d.-]/g, ''));
        let lng = parseFloat(String(rawLng).replace(/[^\d.-]/g, ''));

        // Validation fallback
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.warn("Skipping invalid coordinate entry:", r);
          return;
        }

        // If the values are swapped (Latitude should never be greater than 90)
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
          const temp = lat;
          lat = lng;
          lng = temp;
        }

        activePinsCount++;
        bounds.extend([lng, lat]);

        const t = getRequestType(r.type);
        const hexColor = colorMap[r.type] || "#6b7280";
        const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

        const el = document.createElement("div");
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.cursor = "pointer";
        el.style.display = "block";
        el.style.zIndex = "99999";

        el.innerHTML = `
          <svg viewBox="0 0 24 24" width="32" height="32" style="display: block; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
            <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${shortLabel}</text>
          </svg>
        `;

        const popupContent = `
          <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; width: 160px; color: #1e293b; line-height: 1.4;">
            <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
            <div style="font-size: 13px; font-weight: 700; margin: 1px 0; color: #0f172a;">${r.title || "Untitled"}</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">📍 ${r.locationLabel || "Location"}</div>
            ${r.reward ? `<div style="font-size: 11px; font-weight: 600; color: #10b981;">💰 ${r.reward}</div>` : ""}
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: [0, -10], closeButton: false }).setHTML(popupContent);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });

      // 3. Dynamic Focal Camera System
      if (activePinsCount > 0) {
        if (requests.length === 1) {
          let singleLat = parseFloat(String(requests[0].lat ?? requests[0].latitude).replace(/[^\d.-]/g, ''));
          let singleLng = parseFloat(String(requests[0].lng ?? requests[0].longitude).replace(/[^\d.-]/g, ''));
          
          if (Math.abs(singleLat) > 90 && Math.abs(singleLng) <= 90) {
            const temp = singleLat;
            singleLat = singleLng;
            singleLng = temp;
          }

          if (!isNaN(singleLng) && !isNaN(singleLat)) {
            mapRef.current.setCenter([singleLng, singleLat]);
            mapRef.current.setZoom(14);
          }
        } else {
          mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
        }
      }
    });
  }, [isMapReady, requests]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;
