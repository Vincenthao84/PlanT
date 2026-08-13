import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function AdBanner() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const location = useLocation();

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Inject complete HTML document into the iframe to force a fresh script execution
    const adHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }
          </style>
        </head>
        <body>
          <script>
            (function(nrml){
              var d = document,
                  s = d.createElement('script'),
                  l = d.scripts[d.scripts.length - 1];
              s.settings = nrml || {};
              s.src = "//unfoldedtrade.com/bzXtVTs-d.Gilk0tYpWFcr/ye/mV9RuHZuUllyk/P/T/csy/NuzAk/zbN_jWkhtANTzHIr3yOGT/MM3ZMuwE";
              s.async = true;
              s.referrerPolicy = 'no-referrer-when-downgrade';
              l.parentNode.insertBefore(s, l);
            })({});
          </script>
        </body>
      </html>
    `;

    // Write content directly to the iframe's document
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(adHtml);
      doc.close();
    }
  }, [location.pathname]);

  return (
    <div className="w-full flex justify-center items-center my-6 overflow-hidden min-h-[90px]">
      <iframe
        ref={iframeRef}
        title="Ad Banner"
        className="w-full border-0 overflow-hidden min-h-[90px]"
        scrolling="no"
      />
    </div>
  );
}
