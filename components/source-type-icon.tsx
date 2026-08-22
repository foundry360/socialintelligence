"use client";

import { useState } from "react";
import { File, GlobeCheck, SquareText } from "lucide-react";

/** Google's favicon service - reliable for source list thumbnails. */
export function faviconUrlForPage(
  pageUrl: string | null | undefined,
  size = 32,
): string | null {
  if (!pageUrl?.trim()) return null;
  try {
    const host = new URL(pageUrl).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}

function FaviconImage({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <GlobeCheck className={className} aria-hidden />;
  }
  return (
    <img
      src={src}
      alt=""
      width={22}
      height={22}
      className={`${className} rounded-sm object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

export function SourceTypeIcon({
  sourceType,
  url,
  className = "mt-0.5 h-[22px] w-[22px] shrink-0 text-muted",
}: {
  sourceType: string;
  url?: string | null;
  className?: string;
}) {
  const favicon = sourceType === "url" ? faviconUrlForPage(url) : null;

  if (sourceType === "url") {
    if (favicon) {
      return <FaviconImage key={favicon} src={favicon} className={className} />;
    }
    return <GlobeCheck className={className} aria-hidden />;
  }

  if (sourceType === "note") {
    return <SquareText className={className} aria-hidden />;
  }

  return <File className={className} aria-hidden />;
}
