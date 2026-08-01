function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Prevent duplicate script insertion
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    // 2. Create the ad container element required by the provider
    const adContainer = document.createElement("div");
    adContainer.id = "container-96cb238e2a51c4f8743d8be3ed10db58";

    // 3. Create and configure the script tag dynamically
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://pl30619969.effectivecpmnetwork.com/96cb238e2a51c4f8743d8be3ed10db58/invoke.js";

    // 4. Append both elements to our React ref container
    containerRef.current.appendChild(adContainer);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full flex justify-center items-center my-6 overflow-hidden min-h-[90px]">
      <div ref={containerRef} />
    </div>
  );
}
