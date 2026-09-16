import Link from "next/link";
import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBreakingNews } from "@/features/news/news.api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About Us",
  description: "Learn about Indian Rajneeti and our commitment to clear, trustworthy, and accessible coverage of Indian politics.",
  path: "/about",
});

const WORK = [
  {
    icon: "fa-newspaper",
    title: "Political reporting",
    text: "We cover major political developments, elections, Parliament, parties, and leaders across India.",
  },
  {
    icon: "fa-magnifying-glass-chart",
    title: "Clear analysis",
    text: "We explain complex policies and political events in straightforward language, with context that helps readers understand why they matter.",
  },
  {
    icon: "fa-people-group",
    title: "Public engagement",
    text: "We bring citizens closer to democratic institutions through interviews, speeches, regional coverage, and informed public discussion.",
  },
];

export default async function AboutPage() {
  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <section className="border-b border-outline-variant/20 bg-surface px-4 py-14 md:px-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <span className="font-label-sm text-xs font-bold uppercase tracking-[0.22em] text-secondary">About Indian Rajneeti</span>
            <h1 className="mt-3 font-display-lg text-4xl tracking-tight text-primary md:text-5xl">Politics, explained with clarity</h1>
            <p className="mx-auto mt-5 max-w-3xl font-body-lg text-base leading-relaxed text-on-surface-variant md:text-lg">
              Indian Rajneeti is a digital platform dedicated to trustworthy, accessible coverage of Indian politics. We help readers follow the people, institutions, elections, and policies shaping the world&apos;s largest democracy.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-16 md:py-16">
          <div className="text-center">
            <h2 className="font-display-lg text-3xl text-on-surface">What we do</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body-md text-sm leading-relaxed text-on-surface-variant">
              Our work is built around useful reporting, responsible analysis, and a stronger connection between citizens and public life.
            </p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {WORK.map((item) => (
              <article key={item.title} className="rounded-xl border border-outline-variant/25 bg-surface p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-headline-md text-lg text-on-surface">{item.title}</h3>
                <p className="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-xl bg-primary px-6 py-7 text-center text-on-primary sm:flex-row sm:text-left md:px-8">
            <div>
              <h2 className="font-headline-lg text-xl text-white">Have a question or story idea?</h2>
              <p className="mt-1 font-body-md text-sm text-white/75">Our editorial team would be glad to hear from you.</p>
            </div>
            <Link href="/contact" className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-label-md text-sm font-semibold text-primary transition-colors hover:bg-primary-fixed">
              Contact us <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
