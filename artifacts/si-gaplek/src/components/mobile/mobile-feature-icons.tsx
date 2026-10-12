import React from "react";

/**
 * 2D Flat Geometric Vector Icons matching the user reference image:
 * Palette: Royal Blue (#2563EB, #1D4ED8), Coral Red (#EF4444), Orange (#F97316),
 * Soft Warm Cream (#FFF3E8), Slate Navy (#0F172A), Crisp White (#FFFFFF).
 */

// 1. Terima Barang / Surat Jalan (Dus biru, lakban orange, badge ceklis merah - Row 2 Col 3)
export function IconTerimaBarang({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Box Back / Shadow */}
      <path d="M14 26L32 15L50 26L32 37L14 26Z" fill="#3B82F6" />
      {/* Box Left Side */}
      <path d="M14 26L32 37V52L14 41V26Z" fill="#1D4ED8" />
      {/* Box Right Side */}
      <path d="M32 37L50 26V41L32 52V37Z" fill="#2563EB" />
      {/* Orange Tape Across Top */}
      <path d="M28 17.5L36 22.5L25 29.5L17 24.5L28 17.5Z" fill="#F97316" />
      <path d="M28 34.5L36 29.5V44.5L28 49.5V34.5Z" fill="#EA580C" />
      {/* White Highlight Seam */}
      <path d="M32 37V52" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Red Circle Checkmark Badge */}
      <circle cx="47" cy="45" r="9" fill="#EF4444" />
      <path
        d="M43.5 45L46 47.5L50.5 42.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 2. Cek Stok Material / Gudang (Tangan lengan merah memegang dus biru & panah masuk - Row 3 Col 3)
export function IconCekStok({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Items in Box */}
      <rect x="22" y="16" width="10" height="14" rx="2" fill="#F97316" />
      <rect x="34" y="19" width="10" height="11" rx="2" fill="#CBD5E1" />
      <circle cx="27" cy="18" r="3" fill="#FCD34D" />
      {/* Blue Box Body */}
      <path d="M16 28H48V42C48 45.3137 45.3137 48 42 48H22C18.6863 48 16 45.3137 16 42V28Z" fill="#2563EB" />
      <path d="M14 26H50V30H14V26Z" fill="#1D4ED8" />
      {/* White Accent Lines on Box */}
      <rect x="22" y="34" width="8" height="2" rx="1" fill="#93C5FD" />
      <rect x="22" y="38" width="14" height="2" rx="1" fill="#93C5FD" />
      {/* Hand with Red Sleeve */}
      <path d="M11 54L17 45L22 47L17 56H11V54Z" fill="#EF4444" />
      <path d="M18 46L24 40C25 39 27 40 28 41L25 48L18 46Z" fill="#FFEDD5" />
      <path d="M22 47C26 50 34 50 42 47L44 50C34 53 24 53 19 49L22 47Z" fill="#FFEDD5" />
      {/* Red Circle Down-Arrow Badge */}
      <circle cx="48" cy="22" r="8" fill="#EF4444" />
      <path
        d="M48 18V26M48 26L45 23M48 26L51 23"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 3. Catat Pasang Aksesoris (Penggaris biru miring + badge kubus fitting - Row 3 Col 2)
export function IconCatatPasang({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Yellow Semi-Circle Accent */}
      <path d="M20 28C20 20.268 26.268 14 34 14C37.5 14 40.5 15.3 43 17.5" stroke="#F97316" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 6" />
      {/* Blue Diagonal Ruler */}
      <g transform="rotate(-35 30 32)">
        <rect x="18" y="14" width="28" height="12" rx="3" fill="#2563EB" />
        {/* Ruler Tick Marks */}
        <line x1="22" y1="14" x2="22" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="14" x2="26" y2="16.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="30" y1="14" x2="30" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="34" y1="14" x2="34" y2="16.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="38" y1="14" x2="38" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="42" y1="14" x2="42" y2="16.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* Red Circle Fitting / Cube Badge */}
      <circle cx="43" cy="44" r="10" fill="#EF4444" />
      {/* Isometric Cube in Badge */}
      <path d="M43 38L48 41V47L43 50L38 47V41L43 38Z" fill="#F97316" />
      <path d="M43 38L48 41L43 44L38 41L43 38Z" fill="#FDBA74" />
      <path d="M38 41L43 44V50L38 47V41Z" fill="#EA580C" />
      <path d="M43 44L48 41V47L43 50V44Z" fill="#C2410C" />
    </svg>
  );
}

// 4. Scan Barcode / QR (Mesin EDC / Terminal biru dengan tombol putih - Row 2 Col 2)
export function IconScanBarcode({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Card Inserted on Right */}
      <rect x="36" y="20" width="18" height="24" rx="3" fill="#F97316" />
      <rect x="36" y="23" width="18" height="5" fill="#C2410C" />
      {/* Blue EDC Body */}
      <rect x="18" y="15" width="28" height="36" rx="7" fill="#2563EB" />
      {/* Screen Display */}
      <rect x="22" y="19" width="20" height="10" rx="3" fill="#60A5FA" />
      <rect x="24" y="23" width="16" height="2" rx="1" fill="#FFFFFF" />
      {/* Round White Buttons (3x3 grid) */}
      <circle cx="25" cy="34" r="2" fill="#FFFFFF" />
      <circle cx="32" cy="34" r="2" fill="#FFFFFF" />
      <circle cx="39" cy="34" r="2" fill="#FFFFFF" />
      <circle cx="25" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="32" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="39" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="25" cy="46" r="2" fill="#34D399" />
      <circle cx="32" cy="46" r="2" fill="#F87171" />
      <circle cx="39" cy="46" r="2" fill="#FCD34D" />
    </svg>
  );
}

// 5. Lacak Kiriman / Distribusi (Truk kurir / paket ekspedisi cepat)
export function IconLacakKiriman({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Route Road Line */}
      <path d="M12 49H52" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      {/* Truck Body Back */}
      <rect x="14" y="21" width="24" height="23" rx="4" fill="#2563EB" />
      {/* Cargo Detail */}
      <rect x="17" y="27" width="18" height="3" rx="1.5" fill="#60A5FA" />
      <rect x="17" y="33" width="12" height="3" rx="1.5" fill="#60A5FA" />
      {/* Truck Cabin Front */}
      <path d="M38 27H45C47.2091 27 49 28.7909 49 31V44H38V27Z" fill="#1D4ED8" />
      {/* Cabin Window */}
      <path d="M41 30H46L48 35H41V30Z" fill="#BFDBFE" />
      {/* Orange Headlight */}
      <rect x="47" y="39" width="3" height="3" rx="1.5" fill="#F97316" />
      {/* Wheels with Red Accent */}
      <circle cx="23" cy="46" r="5" fill="#0F172A" />
      <circle cx="23" cy="46" r="2" fill="#EF4444" />
      <circle cx="43" cy="46" r="5" fill="#0F172A" />
      <circle cx="43" cy="46" r="2" fill="#EF4444" />
      {/* GPS Location Pin Badge */}
      <circle cx="26" cy="18" r="6" fill="#EF4444" />
      <circle cx="26" cy="18" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

// 6. Retur Material (Kartu bertumpuk dengan panah balik - Row 2 Col 1 style)
export function IconReturMaterial({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Back Red/Orange Card */}
      <rect x="15" y="19" width="30" height="20" rx="4" fill="#EF4444" />
      <rect x="15" y="22" width="30" height="4" fill="#B91C1C" />
      {/* Front Royal Blue Card */}
      <rect x="21" y="26" width="30" height="20" rx="4" fill="#2563EB" />
      <rect x="21" y="29" width="30" height="4" fill="#0F172A" />
      {/* Card Chip & Lines */}
      <rect x="25" y="37" width="6" height="5" rx="1" fill="#FCD34D" />
      <rect x="34" y="38" width="12" height="2" rx="1" fill="#93C5FD" />
      {/* Curved Return Arrow Badge */}
      <circle cx="19" cy="44" r="8" fill="#F97316" />
      <path
        d="M21 41L17 44L21 47"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 44H20C22.2091 44 24 42.2091 24 40"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 7. Tim Teknisi / Personel Lapangan (Dua figur biru + panah melingkar merah - Row 3 Col 1)
export function IconTimTeknisi({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Left Back Avatar */}
      <circle cx="26" cy="22" r="5" fill="#0F172A" />
      <circle cx="26" cy="23" r="4.5" fill="#FFEDD5" />
      <path d="M22 21C22 19 23.5 17 26 17C28.5 17 30 19 30 21V22H22V21Z" fill="#0F172A" />
      <path d="M19 36C19 32 22 30 26 30C30 30 33 32 33 36V37H19V36Z" fill="#3B82F6" />

      {/* Right Front Avatar */}
      <circle cx="39" cy="26" r="6" fill="#0F172A" />
      <circle cx="39" cy="27" r="5.5" fill="#FFEDD5" />
      <path d="M34 25C34 22 36 20 39 20C42 20 44 22 44 25V27H34V25Z" fill="#0F172A" />
      <path d="M30 43C30 38 34 36 39 36C44 36 48 38 48 43V44H30V43Z" fill="#1D4ED8" />

      {/* Curved Red Arrow Badge (Circulating Arrow) */}
      <path
        d="M17 48C15 44 16 38 21 34"
        stroke="#EF4444"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 44L17 49L22 47"
        fill="#EF4444"
      />
    </svg>
  );
}

// 8. Titik Peta GIS / Pemasangan Lapangan (Peta lipat biru + pin merah)
export function IconPetaGis({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Folded Map Segments */}
      <path d="M15 25L26 21V45L15 49V25Z" fill="#60A5FA" />
      <path d="M26 21L38 25V49L26 45V21Z" fill="#3B82F6" />
      <path d="M38 25L49 21V45L38 49V25Z" fill="#2563EB" />
      {/* Contour lines */}
      <path d="M18 34C22 32 24 35 26 33" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M28 35C31 38 35 34 38 37" stroke="#DBEAFE" strokeWidth="1.2" strokeLinecap="round" />
      {/* Coral Red Map Pin */}
      <path
        d="M38 15C33.5817 15 30 18.5817 30 23C30 28.5 38 37 38 37C38 37 46 28.5 46 23C46 18.5817 42.4183 15 38 15Z"
        fill="#EF4444"
      />
      <circle cx="38" cy="23" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

// 9. Bantuan & SOP / Layanan (CS perempuan berheadset dengan laptop - Row 1 Col 3)
export function IconBantuanCS({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Speech Bubble with 3 Dots */}
      <rect x="18" y="14" width="16" height="11" rx="4" fill="#F97316" />
      <path d="M22 25L20 28V25H22Z" fill="#F97316" />
      <circle cx="22" cy="19.5" r="1.2" fill="#FFFFFF" />
      <circle cx="26" cy="19.5" r="1.2" fill="#FFFFFF" />
      <circle cx="30" cy="19.5" r="1.2" fill="#FFFFFF" />

      {/* Head & Hair */}
      <circle cx="38" cy="26" r="6" fill="#FFEDD5" />
      <path d="M32 26C32 22 34 19 38 19C42 19 44 22 44 26C44 27 44 28 44 29H32V26Z" fill="#0F172A" />
      <path d="M32 26V30C32 31 33 32 34 32H35V26H32Z" fill="#0F172A" />
      <path d="M44 26V30C44 31 43 32 42 32H41V26H44Z" fill="#0F172A" />

      {/* Headset */}
      <path d="M33 25C33 21 35 18 38 18C41 18 43 21 43 25" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="42.5" y="24" width="2" height="4" rx="1" fill="#3B82F6" />
      <path d="M43 28L40 30" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />

      {/* Red Shirt Body */}
      <path d="M30 42C30 37 33 35 38 35C43 35 46 37 46 42V45H30V42Z" fill="#EF4444" />
      {/* Collar */}
      <path d="M36 35L38 38L40 35H36Z" fill="#FFFFFF" />

      {/* Desk & Laptop */}
      <rect x="24" y="47" width="28" height="3" rx="1.5" fill="#0F172A" />
      <path d="M32 44H44L45 47H31L32 44Z" fill="#E2E8F0" />
    </svg>
  );
}
