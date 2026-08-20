import Link from "next/link";
import { slugify } from "@/lib/slugify";
import { getParties, getChiefMinisters, getKeyFigures, getFormerPMs } from "@/features/politicians/politician.api";
import { getPopularTags } from "@/features/news/news.api";

const SECTIONS = [
  {
    title: "SECTIONS",
    links: ["Lok Sabha", "Rajya Sabha", "Legislative Assembly", "Policy Analysis"],
  },
  {
    title: "ABOUT",
    links: ["Our History", "Editorial Team", "Ethics Code", "Careers"],
  },
  {
    title: "LEGAL",
    links: ["Terms of Service", "Privacy Policy", "Ad Choices", "Cookie Policy"],
  },
];

const COVERAGE_LINKS = [
  { label: "Lok Sabha", href: "/loksabha" },
  { label: "Rajya Sabha", href: "/rajyasabha" },
  { label: "Elections", href: "/elections" },
  { label: "Speeches", href: "/speeches" },
  { label: "Rallies", href: "/rallies" },
  { label: "Political Calendar", href: "/political-calendar" },
];

function KeywordColumn({ title, viewAllHref, items }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 border-b border-outline-variant/20 pb-2">
        <h3 className="font-label-md text-primary text-xs uppercase tracking-widest">{title}</h3>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-[10px] font-label-md text-secondary hover:underline flex-shrink-0">
            View All
          </Link>
        )}
      </div>
      <ul className="space-y-1.5 font-body-md text-on-surface-variant text-xs">
        {items.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} className="hover:text-primary hover:translate-x-1 transition-all inline-block">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Footer() {
  const [parties, chiefMinisters, keyFigures, formerPMs, popularTags] = await Promise.all([
    getParties(),
    getChiefMinisters(),
    getKeyFigures(),
    getFormerPMs(),
    getPopularTags(),
  ]);

  // Capped to keep the columns roughly even — each group's "View All" link
  // (or the dedicated page it mirrors) covers whatever isn't shown here.
  const partyLinks = parties.slice(0, 8).map((party) => ({
    label: party.abbreviation,
    href: `/category/${slugify(party.abbreviation)}`,
  }));

  const leaderLinks = [...keyFigures, ...formerPMs].slice(0, 8).map((leader) => ({
    label: leader.name,
    href: `/category/${slugify(leader.name)}`,
  }));

  const stateLinks = chiefMinisters.slice(0, 8).map((cm) => ({
    label: cm.state,
    href: `/category/${slugify(cm.state)}`,
  }));

  const tagLinks = popularTags.slice(0, 8).map((tag) => ({
    label: tag,
    href: `/category/${slugify(tag)}`,
  }));

  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant/50 pt-10 pb-6">
      <div className="max-w-[1280px] mx-auto px-4 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h2 className="font-headline-md text-primary mb-3 text-base">INDIAN RAJNITI</h2>
            <p className="font-body-md text-on-surface-variant mb-4 text-xs">
              Authoritative political analysis and policy discourse from the heart of the world&apos;s largest democracy.
            </p>
            <div className="flex gap-4 text-on-surface-variant">
              <i className="fa-solid fa-globe cursor-pointer hover:text-primary hover:scale-110 transition-transform text-lg" />
              <i className="fa-solid fa-rss cursor-pointer hover:text-primary hover:scale-110 transition-transform text-lg" />
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="font-label-md text-primary mb-2 text-xs">{section.title}</h3>
              <ul className="space-y-1 font-body-md text-on-surface-variant text-xs">
                {section.links.map((link) =>
                  link === "Careers" ? (
                    <li key={link} className="hover:text-primary hover:translate-x-1 transition-all">
                      <Link href="/careers" className="inline-block">
                        {link}
                      </Link>
                    </li>
                  ) : (
                    <li key={link} className="hover:text-primary hover:translate-x-1 transition-all cursor-pointer">
                      {link}
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Political keyword directory — every link here resolves through
            the same /category/[slug] registry the sidebars and home page
            use, so nothing here is a dead end. Given its own card treatment
            (lighter surface + border) so it reads as a distinct directory
            rather than a continuation of the utility links above. */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <i className="fa-solid fa-hashtag text-secondary text-sm" />
            <h2 className="font-headline-md text-primary text-sm uppercase tracking-widest">Explore by Keyword</h2>
            <div className="h-px flex-grow bg-outline-variant/30" />
          </div>
          <div className="bg-surface rounded-lg border border-outline-variant/20 p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-6">
            <KeywordColumn title="Coverage" items={COVERAGE_LINKS} />
            <KeywordColumn title="Political Parties" viewAllHref="/parties" items={partyLinks} />
            <KeywordColumn title="Political Leaders" viewAllHref="/key-political-figures" items={leaderLinks} />
            <KeywordColumn title="States" viewAllHref="/state" items={stateLinks} />
            <KeywordColumn title="Popular Keywords" items={tagLinks} />
          </div>
        </div>

        <div className="border-t border-outline-variant/30 pt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant font-label-sm text-[10px]">
          <p>&copy; 2026 Indian Rajniti Publications. All rights reserved.</p>
          <p className="flex flex-wrap justify-center gap-4">
            <span className="hover:text-primary transition-colors cursor-pointer">NEW DELHI</span>
            <span className="hover:text-primary transition-colors cursor-pointer">MUMBAI</span>
            <span className="hover:text-primary transition-colors cursor-pointer">CHENNAI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
