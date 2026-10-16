import { useEffect } from "react";

export default function PwaCabangPage() {
  useEffect(() => {
    document.title = "PDAM Cabang — Monitoring Aksesoris";
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-[#ECECEE] dark:bg-[#0B0B0D] z-[99999]">
      <iframe
        src="/app-cabang/index.html"
        className="w-full h-full border-0 block"
        allow="camera; geolocation; microphone"
        title="PDAM Cabang — Monitoring Aksesoris"
      />
    </div>
  );
}
