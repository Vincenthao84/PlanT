import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

const colorMap: Record<string, string> = {
  snap: "#ef4444",
  knowledge: "#3b82f6",
  action: "#10b981",
  object: "#f59e0b",
  rental: "#8b5cf6",
  anything: "#6b7280",
};

// Raw SVGs to act as the "logos" inside the map pins
const iconMap: Record<string, string> = {
  snap: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  knowledge: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  action: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  object: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  rental: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  anything: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const navigate = useNavigate();

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
      center: [0, 0],
      zoom: 2,        
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !requests) return;

    // Clear old markers cleanly
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let validPinsCount = 0;

    requests.forEach((r: any) => {
      if (!r) return;

      let lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      let lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      validPinsCount++;
      const coordinates: [number, number] = [lng, lat];
      bounds.extend(coordinates);

      const hexColor = colorMap[r.type] || "#3b82f6";
      const svgIcon = iconMap[r.type] || iconMap.anything;

      // 1. Create the Custom HTML Pin
      const el = document.createElement("div");
      el.className = "custom-map-pin";
      el.style.backgroundColor = hexColor;
      el.innerHTML = svgIcon;

      // 2. Setup the hover Popup
      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; min-width: 120px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${r.title || "Request"}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 ${r.locationLabel || "Location"}</div>
        </div>
      `;
      // closeButton: false ensures it acts purely as a hover tooltip
      const popup = new maplibregl.Popup({ offset: [0, -20], closeButton: false, closeOnClick: false })
        .setHTML(popupContent);

      // 3. Attach Custom Events
      el.addEventListener('mouseenter', () => popup.addTo(mapRef.current!));
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // Route to the request details page
        navigate({ to: "/request/$id", params: { id: r.id } });
      });

      // 4. Mount the Custom Marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coordinates)
        .setPopup(popup) // Retain popup registration but it opens via our hover logic
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Auto-zoom to pins ONLY after map layout is fully loaded
    const applyBounds = () => {
      if (validPinsCount === 1) {
        mapRef.current?.setCenter(bounds.getCenter());
        mapRef.current?.setZoom(15);
      } else if (validPinsCount > 1) {
        mapRef.current?.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });
      }
    };

    if (mapRef.current.loaded()) {
      applyBounds();
    } else {
      mapRef.current.once("load", applyBounds);
    }
    
  }, [requests, navigate]);

  return (
    <div className="w-full h-full min-h-[400px] relative z-0">
      <style>{`
        /* Style the Custom Pin */
        .custom-map-pin {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.1s ease-in-out !important;
        }

        .custom-map-pin:hover {
          transform: scale(1.15) !important;
        }

        /* Fix 1: Stop markers from stacking in a vertical line */
        .maplibregl-marker {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          
          /* Fix 2: Stop markers from floating/lagging when panning and zooming */
          transition: none !important;
          transform-style: flat !important;
        }
        
        /* Protect the map canvas and popups from global CSS transitions as well */
        .maplibregl-canvas, .maplibregl-popup {
          transition: none !important;
        }
        
        /* Keep Popups looking clean */
        .maplibregl-popup-content {
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
      
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;
