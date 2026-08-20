"use client";

import { useState } from "react";

// Circular photo avatar for politician/party cards — shows a shimmer while
// the real photo loads, falls back to initials/abbreviation on a gradient
// when no photo exists yet (matches ImagePlaceholder's loading behavior,
// just circular instead of rectangular).
export default function Avatar({ photo, alt = "", fallbackText = "", gradient = "from-primary to-primary-container", className = "w-20 h-20" }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center ${className}`}>
      {photo ? (
        <>
          {!loaded && <span className="shimmer-sweep" aria-hidden="true" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- remote, arbitrary-origin URLs; no next.config domain to pin */}
          <img
            src={photo}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </>
      ) : (
        <span className="font-headline-md text-white text-xl relative z-10">{fallbackText}</span>
      )}
    </div>
  );
}
