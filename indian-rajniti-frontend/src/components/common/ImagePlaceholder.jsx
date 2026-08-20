"use client";

import { useState } from "react";

const GRADIENTS = {
  primary: "from-primary to-primary-container",
  secondary: "from-secondary to-secondary-container",
  inverse: "from-inverse-surface to-tertiary-container",
  tint: "from-surface-tint to-primary",
};

export default function ImagePlaceholder({
  icon = "fa-solid fa-image",
  gradient = "primary",
  className = "",
  iconClassName = "text-2xl",
  image = "",
  alt = "",
}) {
  const [loaded, setLoaded] = useState(false);

  if (image) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br ${GRADIENTS[gradient] || GRADIENTS.primary} ${className}`}>
        {/* Shown until the real photo finishes loading, then fades out —
            real images can take a moment over the network, so this covers
            that gap instead of leaving a blank/broken-looking box. */}
        {!loaded && <span className="shimmer-sweep" aria-hidden="true" />}
        {/* eslint-disable-next-line @next/next/no-img-element -- remote, arbitrary-origin URLs; no next.config domain to pin */}
        <img
          src={image}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${GRADIENTS[gradient] || GRADIENTS.primary} flex items-center justify-center ${className}`}
    >
      <span className="shimmer-sweep" aria-hidden="true" />
      <i className={`${icon} text-white/50 ${iconClassName} relative z-10`} />
    </div>
  );
}
