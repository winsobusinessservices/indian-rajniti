import ImagePlaceholder from "@/components/common/ImagePlaceholder";
import { formatViews } from "@/lib/formatViews";

export default function VideoCard({ title, category, image, views = 0 }) {
  return (
    <div className="group cursor-pointer">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
        <ImagePlaceholder icon="fa-solid fa-video" image={image} alt={title} gradient="secondary" className="w-full h-full" iconClassName="text-3xl" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <i className="fa-solid fa-circle-play text-white text-4xl opacity-90 group-hover:scale-110 transition-transform" />
        </div>
      </div>
      {category && (
        <span className="text-[10px] font-bold text-surface-tint uppercase tracking-wider">{category}</span>
      )}
      <h3 className="font-headline-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug mt-1">
        {title}
      </h3>
      <span className="inline-flex items-center gap-1 text-[10px] text-outline mt-1">
        <i className="fa-regular fa-eye" /> {formatViews(views)}
      </span>
    </div>
  );
}
