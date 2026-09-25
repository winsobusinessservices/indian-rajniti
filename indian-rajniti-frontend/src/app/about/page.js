import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBreakingNews, getManagedPages } from "@/features/news/news.api";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import ManagedText from "@/components/common/ManagedText";
import { richTextToPlainText } from "@/lib/richText";

export async function generateMetadata() {
  const managed = (await getManagedPages()).about;
  return buildPageMetadata({ title: managed?.title || "About", description: richTextToPlainText(managed?.description), path: "/about" });
}

export default async function AboutPage() {
  const [breakingNews, pages] = await Promise.all([getBreakingNews(), getManagedPages()]);
  const managed = pages.about || {};
  if (managed.enabled === false) notFound();
  const cards = managed.cards || [];

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <section className="border-b border-outline-variant/20 bg-surface px-4 py-14 md:px-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <span className="font-label-sm text-xs font-bold uppercase tracking-[0.22em] text-secondary">{managed.eyebrow}</span>
            <h1 className="mt-3 font-display-lg text-4xl tracking-tight text-primary md:text-5xl">{managed.title}</h1>
            <ManagedText text={managed.description} className="mx-auto mt-5 max-w-3xl space-y-3 font-body-lg text-base leading-relaxed text-on-surface-variant md:text-lg" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-16 md:py-16">
          <div className="text-center">
            {managed.cardsTitle && <h2 className="font-display-lg text-3xl text-on-surface">{managed.cardsTitle}</h2>}
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {cards.map((item) => (
              <article key={item.title} className="rounded-xl border border-outline-variant/25 bg-surface p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <i className={`fa-solid ${item.icon || "fa-circle-info"}`} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-headline-md text-lg text-on-surface">{item.title}</h3>
                <ManagedText text={item.text} className="mt-2 space-y-3 font-body-md text-sm leading-relaxed text-on-surface-variant" />
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
