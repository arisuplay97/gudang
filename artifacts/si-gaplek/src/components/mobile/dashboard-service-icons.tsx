import React from "react";

/**
 * Custom 3D/Vibrant Vector Icons for SIMONA Mobile Dashboard
 * Designed to match the exact aesthetic of Perumdam Tirta Ardhia Rinjani's
 * mobile service shortcuts (clean, colorful, dimensional with corner badges).
 */

export function IconStokMaterial({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="calGrad" x1="10" y1="12" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>
        <linearGradient id="calHeader" x1="10" y1="12" x2="54" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF4444" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="badgeGreen" x1="36" y1="36" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <filter id="shadowBox" x="4" y="8" width="56" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
        <filter id="shadowBadge" x="32" y="32" width="30" height="30" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#059669" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Calendar Base with Shadow */}
      <g filter="url(#shadowBox)">
        {/* Main Card Body */}
        <rect x="11" y="14" width="42" height="40" rx="10" fill="url(#calGrad)" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* Header Red Bar */}
        <path
          d="M11 24C11 18.4772 15.4772 14 21 14H43C48.5228 14 53 18.4772 53 24V26H11V24Z"
          fill="url(#calHeader)"
        />
        {/* Calendar Hanging Pins */}
        <rect x="19" y="10" width="4" height="7" rx="2" fill="#94A3B8" />
        <rect x="41" y="10" width="4" height="7" rx="2" fill="#94A3B8" />

        {/* Calendar Grid Dots / Days */}
        <circle cx="19" cy="33" r="2" fill="#94A3B8" />
        <circle cx="27" cy="33" r="2" fill="#94A3B8" />
        <circle cx="35" cy="33" r="2" fill="#94A3B8" />
        <circle cx="43" cy="33" r="2" fill="#94A3B8" />

        <circle cx="19" cy="40" r="2" fill="#94A3B8" />
        <circle cx="27" cy="40" r="2" fill="#94A3B8" />
        <circle cx="35" cy="40" r="2" fill="#94A3B8" />

        <circle cx="19" cy="47" r="2" fill="#94A3B8" />
        <circle cx="27" cy="47" r="2" fill="#94A3B8" />
      </g>

      {/* Emerald Checkmark Badge */}
      <g filter="url(#shadowBadge)">
        <circle cx="47" cy="47" r="11" fill="url(#badgeGreen)" stroke="#FFFFFF" strokeWidth="2" />
        <path
          d="M42.5 47L45.5 50L51.5 44"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function IconTerimaBarang({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="boardGrad" x1="12" y1="12" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="clockGrad" x1="36" y1="36" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" />
          <stop offset="1" stopColor="#BAE6FD" />
        </linearGradient>
        <filter id="shadowClip" x="6" y="8" width="52" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0369A1" floodOpacity="0.18" />
        </filter>
        <filter id="shadowClock" x="33" y="33" width="28" height="28" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Clipboard Body */}
      <g filter="url(#shadowClip)">
        <rect x="13" y="13" width="38" height="42" rx="9" fill="url(#boardGrad)" />
        {/* Clip at top */}
        <rect x="24" y="9" width="16" height="7" rx="3.5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
        <circle cx="32" cy="12" r="1.5" fill="#475569" />

        {/* Paper Sheet */}
        <rect x="18" y="19" width="28" height="32" rx="5" fill="#FFFFFF" />

        {/* Checklist Rows with Bullets */}
        <circle cx="23" cy="26" r="1.75" fill="#10B981" />
        <rect x="28" y="24.5" width="13" height="3" rx="1.5" fill="#94A3B8" />

        <circle cx="23" cy="33" r="1.75" fill="#10B981" />
        <rect x="28" y="31.5" width="11" height="3" rx="1.5" fill="#94A3B8" />

        <circle cx="23" cy="40" r="1.75" fill="#0284C7" />
        <rect x="28" y="38.5" width="8" height="3" rx="1.5" fill="#94A3B8" />
      </g>

      {/* Clock Badge on Corner */}
      <g filter="url(#shadowClock)">
        <circle cx="47" cy="47" r="11" fill="url(#clockGrad)" stroke="#0284C7" strokeWidth="2" />
        {/* Clock Hands */}
        <circle cx="47" cy="47" r="1.5" fill="#0369A1" />
        <path d="M47 42V47H50.5" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function IconLacakKiriman({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="calBlueGrad" x1="10" y1="12" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id="calBlueHeader" x1="10" y1="12" x2="54" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="starBadgeGrad" x1="36" y1="36" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="shadowCal2" x="4" y="8" width="56" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1E1B4B" floodOpacity="0.12" />
        </filter>
        <filter id="shadowStar" x="33" y="33" width="28" height="28" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Calendar Base */}
      <g filter="url(#shadowCal2)">
        <rect x="11" y="14" width="42" height="40" rx="10" fill="url(#calBlueGrad)" stroke="#CBD5E1" strokeWidth="1.5" />
        <path
          d="M11 24C11 18.4772 15.4772 14 21 14H43C48.5228 14 53 18.4772 53 24V26H11V24Z"
          fill="url(#calBlueHeader)"
        />
        {/* Hanging Rings (4 rings like in reference photo) */}
        <rect x="17" y="10" width="3" height="7" rx="1.5" fill="#94A3B8" />
        <rect x="25" y="10" width="3" height="7" rx="1.5" fill="#94A3B8" />
        <rect x="36" y="10" width="3" height="7" rx="1.5" fill="#94A3B8" />
        <rect x="44" y="10" width="3" height="7" rx="1.5" fill="#94A3B8" />

        {/* Calendar Grid of circles */}
        <circle cx="19" cy="33" r="2" fill="#818CF8" />
        <circle cx="27" cy="33" r="2" fill="#818CF8" />
        <circle cx="35" cy="33" r="2" fill="#818CF8" />
        <circle cx="43" cy="33" r="2" fill="#818CF8" />

        <circle cx="19" cy="40" r="2" fill="#818CF8" />
        <circle cx="27" cy="40" r="2" fill="#818CF8" />
        <circle cx="35" cy="40" r="2" fill="#818CF8" />

        <circle cx="19" cy="47" r="2" fill="#818CF8" />
        <circle cx="27" cy="47" r="2" fill="#818CF8" />
      </g>

      {/* Gold Star Badge */}
      <g filter="url(#shadowStar)">
        <circle cx="47" cy="47" r="11" fill="url(#starBadgeGrad)" stroke="#FFFFFF" strokeWidth="2" />
        {/* Star Icon */}
        <path
          d="M47 41.5L48.6 44.8L52.2 45.3L49.6 47.8L50.2 51.5L47 49.7L43.8 51.5L44.4 47.8L41.8 45.3L45.4 44.8L47 41.5Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function IconCatatPasang({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="trophyGold" x1="16" y1="12" x2="48" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="baseWood" x1="20" y1="46" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#78350F" />
          <stop offset="1" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id="arrowGreenBadge" x1="36" y1="12" x2="58" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <filter id="shadowTrophy" x="6" y="8" width="52" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#78350F" floodOpacity="0.2" />
        </filter>
        <filter id="shadowArrow" x="33" y="11" width="28" height="28" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#059669" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Trophy Body with Base */}
      <g filter="url(#shadowTrophy)">
        {/* Background Support Pillars (Teal/Mint like reference image) */}
        <rect x="14" y="22" width="6" height="26" rx="3" fill="#6EE7B7" />
        <rect x="44" y="22" width="6" height="26" rx="3" fill="#6EE7B7" />

        {/* Trophy Cup */}
        <path
          d="M20 18H44V29C44 35.6274 38.6274 41 32 41C25.3726 41 20 35.6274 20 29V18Z"
          fill="url(#trophyGold)"
        />
        {/* Trophy Handles */}
        <path
          d="M20 22H16C14.8954 22 14 22.8954 14 24V28C14 31.3137 16.6863 34 20 34V22Z"
          fill="#F59E0B"
        />
        <path
          d="M44 22H48C49.1046 22 50 22.8954 50 24V28C50 31.3137 47.3137 34 44 34V22Z"
          fill="#F59E0B"
        />

        {/* Stem and Base */}
        <rect x="29" y="41" width="6" height="6" fill="#D97706" />
        <rect x="21" y="47" width="22" height="6" rx="2" fill="url(#baseWood)" />
      </g>

      {/* Upward Arrow Badge (top right like in reference photo) */}
      <g filter="url(#shadowArrow)">
        <circle cx="47" cy="25" r="11" fill="url(#arrowGreenBadge)" stroke="#FFFFFF" strokeWidth="2" />
        {/* Upward Arrow Path */}
        <path
          d="M43 28L47 21L51 28M47 22V30"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function IconReturMaterial({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="stopwatchGrad" x1="14" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="36" y1="36" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <filter id="shadowStopwatch" x="6" y="8" width="52" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#C2410C" floodOpacity="0.2" />
        </filter>
        <filter id="shadowBolt" x="33" y="33" width="28" height="28" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Stopwatch Body */}
      <g filter="url(#shadowStopwatch)">
        {/* Top Button and Loops */}
        <rect x="29" y="10" width="6" height="5" rx="1.5" fill="#94A3B8" />
        <rect x="27" y="8" width="10" height="3" rx="1" fill="#64748B" />
        <rect x="42" y="15" width="4" height="4" rx="1" transform="rotate(45 42 15)" fill="#94A3B8" />

        {/* Main Stopwatch Circle */}
        <circle cx="32" cy="34" r="19" fill="url(#stopwatchGrad)" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* White Inner Dial */}
        <circle cx="32" cy="34" r="14" fill="#FFFFFF" />

        {/* Dial ticks */}
        <circle cx="32" cy="24" r="1" fill="#94A3B8" />
        <circle cx="42" cy="34" r="1" fill="#94A3B8" />
        <circle cx="32" cy="44" r="1" fill="#94A3B8" />
        <circle cx="22" cy="34" r="1" fill="#94A3B8" />

        {/* Clock Hands */}
        <circle cx="32" cy="34" r="1.5" fill="#EA580C" />
        <path d="M32 27V34H37" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Lightning Bolt Badge */}
      <g filter="url(#shadowBolt)">
        <circle cx="47" cy="47" r="11" fill="url(#boltGrad)" stroke="#FFFFFF" strokeWidth="2" />
        {/* Lightning Bolt */}
        <path
          d="M48 40L43 47H47.5L46 54L52 46H47.5L48 40Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function IconScanBarcode({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="scanGreen" x1="10" y1="14" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="goldBadge" x1="36" y1="36" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="shadowScan" x="6" y="10" width="52" height="50" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#065F46" floodOpacity="0.22" />
        </filter>
        <filter id="shadowBadgeQr" x="33" y="33" width="28" height="28" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Main Scanner Card */}
      <g filter="url(#shadowScan)">
        {/* Soft card body */}
        <rect x="12" y="14" width="40" height="38" rx="9" fill="url(#scanGreen)" stroke="#6EE7B7" strokeWidth="1.5" />

        {/* Viewfinder white brackets */}
        <path d="M19 22H24M19 22V27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M45 22H40M45 22V27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 44H24M19 44V39" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Barcode Vertical Lines in Center */}
        <rect x="23" y="27" width="2" height="12" rx="1" fill="#FFFFFF" />
        <rect x="27" y="27" width="3.5" height="12" rx="1" fill="#FFFFFF" />
        <rect x="33" y="27" width="1.5" height="12" rx="0.75" fill="#FFFFFF" />
        <rect x="37" y="27" width="3" height="12" rx="1" fill="#FFFFFF" />

        {/* Red/Amber Laser Scan Line with Glow */}
        <line x1="17" y1="33" x2="47" y2="33" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Gold QR Lens Badge on Corner */}
      <g filter="url(#shadowBadgeQr)">
        <circle cx="47" cy="47" r="11" fill="url(#goldBadge)" stroke="#FFFFFF" strokeWidth="2" />
        {/* Mini QR square pattern */}
        <rect x="42.5" y="42.5" width="4" height="4" rx="1" fill="#FFFFFF" />
        <rect x="47.5" y="42.5" width="4" height="4" rx="1" fill="#FFFFFF" />
        <rect x="42.5" y="47.5" width="4" height="4" rx="1" fill="#FFFFFF" />
        <circle cx="49.5" cy="49.5" r="1.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
