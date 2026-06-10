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

  // 1. Initialize Map Canvas base globally
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
      center: [114.1581, 22.3177], // Default center right on Hong Kong!
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

  // 2. Validate, Isolate, and Deep-Parse Pins safely
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !requests) return;

    requestAnimationFrame(() => {
      if (!mapRef.current) return;

      // Wipe active tracking elements from view
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let activePinsCount = 0;

      requests.forEach((r: any) => {
        if (!r) return;

        let rawLat: any = undefined;
        let rawLng: any = undefined;

        // DEEP SEARCH NESTED KEY MATCHING ENGINE:
        // Level 1: Root level fields
        if (r.lat !== undefined) rawLat = r.lat;
        if (r.lng !== undefined) rawLng = r.lng;
        if (r.latitude !== undefined) rawLat = r.latitude;
        if (r.longitude !== undefined) rawLng = r.longitude;

        // Level 2: Nested inside location sub-objects (Option A)
        if (r.location && typeof r.location === 'object') {
          if (r.location.lat !== undefined) rawLat = r.location.lat;
          if (r.location.lng !== undefined) rawLng = r.location.lng;
          if (r.location.latitude !== undefined) rawLat = r.location.latitude;
          if (r.location.longitude !== undefined) rawLng = r.location.longitude;
        }

        // Level 3: Nested inside coordinate wrappers (Option B)
        if (r.coordinates) {
          if (Array.isArray(r.coordinates) && r.coordinates.length >= 2) {
            // GeoJSON order standard is [lng, lat]
            rawLng = r.coordinates[0];
            rawLat = r.coordinates[1];
          } else if (typeof r.coordinates === 'object') {
            if (r.coordinates.lat !== undefined) rawLat = r.coordinates.lat;
            if (r.coordinates.lng !== undefined) rawLng = r.coordinates.lng;
          }
        }

        // Parse extracted values
        let lat = parseFloat(String(rawLat).replace(/[^\d.-]/g, ''));
        let lng = parseFloat(String(rawLng).replace(/[^\d.-]/g, ''));

        // Fallback: If parsing failed but a pinned label string exists containing hardcoded numbers
        if ((isNaN(lat) || isNaN(lng)) && r.locationLabel) {
          // Checks for patterns like "Pinned at 22.3177, 114.1581"
          const match = String(r.locationLabel).match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (match && match.length >= 3) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
          }
        }

        // Final sanity check validation
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          return; // Skip broken items cleanly
        }

        // SWAP PROTECTION ENGINE:
        // Force absolute global tracking standard layout alignment
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
          const temporarySwapHolder = lat;
          lat = lng;
          lng = temporarySwapHolder;
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

      // 3. Zoom Camera dynamically around verified valid pins
      if (activePinsCount > 0) {
        if (activePinsCount === 1) {
          // If there's only one pin, center on it directly
          mapRef.current.setCenter(bounds.getCenter());
          mapRef.current.setZoom(14);
        } else {
          mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
        }
      } else {
        // Fallback: If no pins parsed successfully, default view to Hong Kong
        mapRef.current.setCenter([114.1581, 22.3177]);
        mapRef.current.setZoom(11);
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
