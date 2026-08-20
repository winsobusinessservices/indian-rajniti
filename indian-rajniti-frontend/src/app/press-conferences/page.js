import CategoryPageShell from "@/components/category/CategoryPageShell";
import VideoCard from "@/components/news/VideoCard";
import { getPressConferenceArchive } from "@/features/news/news.api";

export const metadata = { title: "Press Conference Archive" };

export default async function PressConferencesPage() {
  const pressConferences = await getPressConferenceArchive();

  return (
    <CategoryPageShell
      title="Press Conference Archive"
      count={pressConferences.length}
      gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {pressConferences.map((item) => (
        <VideoCard key={item.id} title={item.title} category={item.category} image={item.image} />
      ))}
    </CategoryPageShell>
  );
}
