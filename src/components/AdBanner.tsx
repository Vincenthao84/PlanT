import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation(); // Triggers re-run on route changes

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous DOM contents on page change
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "//unfoldedtrade.com/bzXtVTs-d.Gilk0tYpWFcr/ye/mV9RuHZuUllyk/P/T/csy/NuzAk/zbN_jWkhtANTzHIr3yOGT/MM3ZMuwE";
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";

    // Set script parameters
    (script as any).settings = {};

    // Append script dynamically to force execution on mount
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [location.pathname]); // Re-executes every time the route changes

  return (
    <div className="w-full flex justify-center items-center my-6 overflow-hidden min-h-[90px]">
      <div ref={containerRef} />
    </div>
  );
}
