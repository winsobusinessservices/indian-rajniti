import CategoryPageShell from "@/components/category/CategoryPageShell";
import VideoCard from "@/components/news/VideoCard";
import { getAllVideos } from "@/features/news/news.api";

export const metadata = { title: "Videos" };

export default async function VideosPage() {
  const videos = await getAllVideos();

  return (
    <CategoryPageShell
      title="Videos"
      count={videos.length}
      gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {videos.map((video) => (
        <VideoCard key={video.id} title={video.title} category={video.category} image={video.image} />
      ))}
    </CategoryPageShell>
  );
}
