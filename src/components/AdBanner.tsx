import { useEffect, useRef } from "react";

export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous scripts to avoid duplicates on re-render
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "//unfoldedtrade.com/bzXtVTs-d.Gilk0tYpWFcr/ye/mV9RuHZuUllyk/P/T/csy/NuzAk/zbN_jWkhtANTzHIr3yOGT/MM3ZMuwE";
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";

    // Attach script settings property expected by the third-party script
    (script as any).settings = {};

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full flex justify-center items-center my-6 overflow-hidden min-h-[90px]">
      <div ref={containerRef} />
    </div>
  );
}
