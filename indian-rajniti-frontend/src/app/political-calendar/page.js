import CategoryPageShell from "@/components/category/CategoryPageShell";
import { getPoliticalCalendar } from "@/features/news/news.api";

export const metadata = { title: "Political Calendar" };

export default async function PoliticalCalendarPage() {
  const events = await getPoliticalCalendar();

  return (
    <CategoryPageShell title="Political Calendar" count={events.length} gridClassName="flex flex-col gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-4 p-4 bg-surface-container rounded-lg border border-outline-variant/20"
        >
          <span className="font-label-md text-sm text-primary bg-primary-fixed px-3 py-1.5 rounded-sm flex-shrink-0">
            {event.date}
          </span>
          <p className="font-body-md text-on-surface">{event.title}</p>
        </div>
      ))}
    </CategoryPageShell>
  );
}
