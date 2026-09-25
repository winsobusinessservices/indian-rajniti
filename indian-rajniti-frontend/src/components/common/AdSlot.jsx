import { getAdvertisements } from "@/features/news/news.api";
import { mediaUrl } from "@/lib/api";

function isCurrentlyActive(advertisement, now) {
  if (!advertisement?.enabled || !advertisement.posterUrl) return false;
  const starts = advertisement.startAt ? new Date(advertisement.startAt).getTime() : null;
  const ends = advertisement.endAt ? new Date(advertisement.endAt).getTime() : null;
  return (!starts || starts <= now) && (!ends || ends >= now);
}

export default async function AdSlot({ placement, width, height, label, orientation = "square" }) {
  const advertisements = await getAdvertisements();
  // Scheduling is intentionally evaluated at request time for this server component.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const managedAdvertisement = advertisements.find((item) => item.placement === placement && isCurrentlyActive(item, now));
  if (managedAdvertisement) {
    const title = managedAdvertisement.title || managedAdvertisement.name;
    const advertiser = managedAdvertisement.advertiser || "Sponsored";
    const description = managedAdvertisement.description || `Advertisement by ${advertiser}`;
    const compact = orientation === "horizontal" && height === "50px";
    const poster = (
      <div className="flex h-full w-full items-center justify-center bg-[#f5f5f5]">
        <img
          src={mediaUrl(managedAdvertisement.posterUrl)}
          alt={managedAdvertisement.altText || title || "Advertisement"}
          className="block h-full w-full object-contain"
        />
      </div>
    );
    const linkedPoster = managedAdvertisement.destinationUrl ? (
      <a href={managedAdvertisement.destinationUrl} target="_blank" rel="noopener noreferrer sponsored" aria-label={title || "Open advertisement"} className="block h-full w-full">{poster}</a>
    ) : poster;
    const details = (
      <div className={`flex min-w-0 flex-1 items-center ${compact ? "gap-2 px-2" : "gap-3 px-4 py-2"}`}>
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-[7px]" : "text-[8px]"} truncate font-bold uppercase tracking-wider text-on-surface-variant`}>{advertiser}</p>
          <p className={`${compact ? "text-[11px] leading-4" : "mt-0.5 text-sm"} truncate font-headline-md text-on-surface`}>{title}</p>
          {!compact && <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-on-surface-variant">{description}</p>}
        </div>
        {managedAdvertisement.destinationUrl && <a href={managedAdvertisement.destinationUrl} target="_blank" rel="noopener noreferrer sponsored" className={`${compact ? "px-2 py-1 text-[8px]" : "px-3 py-1.5 text-[9px]"} flex-shrink-0 rounded-sm bg-primary font-bold uppercase tracking-wide text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>{managedAdvertisement.ctaLabel || "Learn more"}</a>}
      </div>
    );
    return (
      <div className="flex flex-col items-center">
        <span className="mb-1 text-[8px] uppercase tracking-widest text-outline-variant">ADVERTISEMENT</span>
        <div className={`w-full overflow-hidden rounded-md border border-outline-variant/40 bg-surface shadow-sm ${orientation === "horizontal" ? "flex" : "flex flex-col"}`} style={{ maxWidth: width, height }}>
          <div className={`${orientation === "horizontal" ? "h-full aspect-square flex-shrink-0 border-r" : orientation === "vertical" ? "h-[58%] border-b" : "h-[56%] border-b"} overflow-hidden border-outline-variant/30`}>
            {linkedPoster}
          </div>
          {details}
        </div>
      </div>
    );
  }

  // Empty placements must not render fictional creatives or reserve visible
  // space. Only advertisements created in the management panel are shown.
  return null;

}
