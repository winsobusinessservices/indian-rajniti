import Link from "next/link";
import { notFound } from "next/navigation";
import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBreakingNews } from "@/features/news/news.api";

const LEGAL_NOTICE =
  "This is demonstration content while the final policy is being reviewed. It is not the final legal text.";

const PAGE_CONTENT = {
  "privacy-policy": {
    eyebrow: "Legal · Demo",
    title: "Privacy Policy",
    description: LEGAL_NOTICE,
    icon: "fa-shield-halved",
    cards: [
      { title: "Information we collect", text: "Account details, messages you send us, and basic technical information needed to operate and secure the website." },
      { title: "How information is used", text: "To provide services, manage contributor accounts, respond to enquiries, improve performance, and prevent misuse." },
      { title: "Your choices", text: "You may request access, correction, or deletion of eligible personal information by contacting our support team." },
    ],
  },
  "terms-of-service": {
    eyebrow: "Legal · Demo",
    title: "Terms of Service",
    description: LEGAL_NOTICE,
    icon: "fa-file-contract",
    cards: [
      { title: "Using the platform", text: "Use Indian Rajneeti lawfully, provide accurate account information, and keep your sign-in details secure." },
      { title: "Contributor content", text: "Authors remain responsible for originality, accuracy, permissions, and compliance of submitted material." },
      { title: "Moderation", text: "Content may be reviewed, edited, rejected, unpublished, or removed when it violates editorial or platform standards." },
    ],
  },
  "cookie-policy": {
    eyebrow: "Legal · Demo",
    title: "Cookie Policy",
    description: LEGAL_NOTICE,
    icon: "fa-cookie-bite",
    cards: [
      { title: "Essential cookies", text: "Used for authentication, security, saved sessions, and other features necessary for the website to function." },
      { title: "Preference cookies", text: "Remember selected settings so the website can provide a more consistent experience on later visits." },
      { title: "Analytics cookies", text: "Help us understand aggregate usage and improve pages; optional analytics should respect your consent choices." },
    ],
  },
  "ad-choices": {
    eyebrow: "Legal · Demo",
    title: "Advertising Choices",
    description: LEGAL_NOTICE,
    icon: "fa-rectangle-ad",
    cards: [
      { title: "Sponsored content", text: "Paid placements and sponsored features should be clearly labelled so readers can distinguish them from editorial work." },
      { title: "Personalisation", text: "Where applicable, visitors will be able to control whether non-essential data is used for personalised advertising." },
      { title: "Sensitive categories", text: "Political advertising requires additional transparency and review before it can appear on the platform." },
    ],
  },
  "ethics-code": {
    eyebrow: "Editorial · Demo",
    title: "Editorial Ethics Code",
    description: "Our full ethics code is being prepared. These sample principles show the standards the newsroom is building around.",
    icon: "fa-scale-balanced",
    cards: [
      { title: "Accuracy first", text: "Verify material before publication, distinguish fact from opinion, and correct significant errors transparently." },
      { title: "Independence", text: "Editorial decisions should be protected from political, commercial, and personal influence." },
      { title: "Fairness", text: "Give relevant parties a reasonable opportunity to respond and represent competing claims in their proper context." },
    ],
  },
  "editorial-team": {
    eyebrow: "About · Demo",
    title: "Editorial Team",
    description: "The full newsroom directory is being prepared. These demo roles show how our editorial desk is organised.",
    icon: "fa-users-rectangle",
    cards: [
      { title: "National Affairs Desk", text: "Coordinates reporting on Parliament, the Union government, national parties, and major institutions." },
      { title: "States & Elections Desk", text: "Tracks state governments, regional parties, campaigns, polling, and election results across India." },
      { title: "Policy & Research Desk", text: "Produces explainers and analysis on legislation, public programmes, budgets, and governance outcomes." },
    ],
  },
  investors: {
    eyebrow: "Company · Demo",
    title: "Investor Relations",
    description: "This section is under development. Here is a preview of the information that will be available to prospective investors.",
    icon: "fa-chart-line",
    cards: [
      { title: "Company overview", text: "A concise introduction to Indian Rajneeti's mission, audience, publishing model, and growth strategy." },
      { title: "Business updates", text: "Periodic platform, readership, product, and operational highlights for approved stakeholders." },
      { title: "Investor enquiries", text: "A dedicated channel for investment-related questions, document requests, and partnership discussions.", href: "/contact" },
    ],
  },
  "advertize-with-us": {
    eyebrow: "Partnerships · Demo",
    title: "Advertise With Us",
    description: "Our media kit is being finalised. These sample opportunities show the placements we plan to offer.",
    icon: "fa-bullhorn",
    cards: [
      { title: "Display campaigns", text: "Responsive placements across selected news, analysis, and category pages with transparent labelling." },
      { title: "Sponsored explainers", text: "Clearly identified partner-supported formats created under defined editorial and disclosure standards." },
      { title: "Campaign enquiries", text: "Tell us about your audience, dates, and campaign goals to begin a media-plan discussion.", href: "/contact" },
    ],
  },
  "advertise-with-us": {
    eyebrow: "Partnerships · Demo",
    title: "Advertise With Us",
    description: "Our media kit is being finalised. These sample opportunities show the placements we plan to offer.",
    icon: "fa-bullhorn",
    cards: [
      { title: "Display campaigns", text: "Responsive placements across selected news, analysis, and category pages with transparent labelling." },
      { title: "Sponsored explainers", text: "Clearly identified partner-supported formats created under defined editorial and disclosure standards." },
      { title: "Campaign enquiries", text: "Tell us about your audience, dates, and campaign goals to begin a media-plan discussion.", href: "/contact" },
    ],
  },
  "connect-as-a-sponsor": {
    eyebrow: "Partnerships · Demo",
    title: "Connect as a Sponsor",
    description: "This programme is being developed. The examples below preview possible sponsorship formats.",
    icon: "fa-handshake-angle",
    cards: [
      { title: "Public-interest series", text: "Support clearly disclosed reporting projects focused on civic awareness, policy literacy, or elections." },
      { title: "Events & conversations", text: "Partner on moderated public discussions, interviews, webinars, and issue-focused forums." },
      { title: "Start a conversation", text: "Share your organisation, proposed theme, audience, and sponsorship objectives with our team.", href: "/contact" },
    ],
  },
  more: {
    eyebrow: "Explore",
    title: "More from Indian Rajneeti",
    description: "Discover more ways to follow our work, collaborate with the platform, and learn about the organisation.",
    icon: "fa-compass",
    cards: [
      { title: "About Indian Rajneeti", text: "Learn about our mission and approach to political reporting and public-interest analysis.", href: "/about" },
      { title: "Careers", text: "Explore current opportunities to work with our editorial, research, and platform teams.", href: "/careers" },
      { title: "Contact us", text: "Send a story idea, correction, partnership proposal, or general enquiry to our team.", href: "/contact" },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGE_CONTENT).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = PAGE_CONTENT[slug];
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function DemoSectionPage({ params }) {
  const { slug } = await params;
  const page = PAGE_CONTENT[slug];
  if (!page) notFound();

  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <section className="border-b border-outline-variant/20 bg-surface px-4 py-12 md:px-16 md:py-16">
          <div className="mx-auto max-w-5xl">
            <nav className="mb-8 flex items-center gap-2 font-label-md text-xs text-on-surface-variant" aria-label="Breadcrumb">
              <Link href="/" className="transition-colors hover:text-primary">Home</Link>
              <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
              <span className="text-primary">{page.title}</span>
            </nav>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
                <i className={`fa-solid ${page.icon}`} aria-hidden="true" />
              </span>
              <div>
                <span className="font-label-sm text-xs font-bold uppercase tracking-[0.2em] text-secondary">{page.eyebrow}</span>
                <h1 className="mt-2 font-display-lg text-3xl tracking-tight text-primary md:text-5xl">{page.title}</h1>
                <p className="mt-3 max-w-3xl font-body-md text-base leading-relaxed text-on-surface-variant">{page.description}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-900">
            <i className="fa-solid fa-person-digging" aria-hidden="true" />
            <p className="font-body-md text-sm"><strong className="font-label-md">Work in progress:</strong> this page contains preview content and will be expanded.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {page.cards.map((card, index) => (
              <article key={card.title} className="flex min-h-56 flex-col rounded-2xl border border-outline-variant/25 bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <span className="font-label-md text-xs font-bold uppercase tracking-widest text-secondary">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="mt-4 font-headline-lg text-xl text-on-surface">{card.title}</h2>
                <p className="mt-3 flex-grow font-body-md text-sm leading-relaxed text-on-surface-variant">{card.text}</p>
                {card.href && (
                  <Link href={card.href} className="mt-5 inline-flex items-center gap-2 font-label-md text-sm font-semibold text-primary hover:underline">
                    Learn more <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
