import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/contact/ContactForm";
import { getBreakingNews } from "@/features/news/news.api";

export const metadata = {
  title: "Contact Us",
  description: "Contact Indian Rajneeti for editorial feedback, story tips, corrections, partnerships, and general enquiries.",
  alternates: { canonical: "/contact" },
};

const CONTACT_DETAILS = [
  {
    icon: "fa-envelope",
    label: "Email",
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@indianrajneeti.com",
    href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@indianrajneeti.com"}`,
  },
  {
    icon: "fa-phone",
    label: "Phone",
    value: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 98765 43210",
    href: `tel:${(process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 98765 43210").replace(/\s/g, "")}`,
  },
  {
    icon: "fa-location-dot",
    label: "Location",
    value: process.env.NEXT_PUBLIC_CONTACT_LOCATION || "New Delhi, India",
    href: "https://www.google.com/maps/search/?api=1&query=New+Delhi%2C+India",
  },
];

export default async function ContactPage() {
  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="flex-grow bg-background">
        <section className="bg-gradient-to-br from-primary via-primary-container to-inverse-surface px-4 py-14 text-on-primary md:px-16 md:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <span className="font-label-sm text-xs font-bold uppercase tracking-[0.24em] text-white/70">Contact Indian Rajneeti</span>
            <h1 className="mt-3 font-display-lg text-4xl tracking-tight text-white md:text-5xl">We&apos;re here to listen</h1>
            <p className="mx-auto mt-4 max-w-2xl font-body-md text-base leading-relaxed text-white/80">
              Reach our editorial and support team for questions, feedback, corrections, story ideas, and collaboration opportunities.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-16 lg:grid-cols-[0.8fr_1.4fr] lg:py-16">
          <aside className="rounded-xl border border-outline-variant/25 bg-surface p-6 shadow-sm md:p-8">
            <h2 className="font-display-lg text-2xl text-on-surface">Contact information</h2>
            <p className="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Choose the most convenient way to reach us. Our team generally responds within two business days.
            </p>

            <div className="mt-7 space-y-4">
              {CONTACT_DETAILS.map((detail) => (
                <a key={detail.label} href={detail.href} target={detail.label === "Location" ? "_blank" : undefined} rel={detail.label === "Location" ? "noopener noreferrer" : undefined} className="group flex items-center gap-4 rounded-xl border border-outline-variant/25 bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <i className={`fa-solid ${detail.icon}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">{detail.label}</span>
                    <span className="mt-1 block break-words font-body-md text-sm font-semibold text-on-surface group-hover:text-primary">{detail.value}</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-surface-container p-5">
              <h3 className="font-headline-md text-base text-on-surface">Editorial enquiries</h3>
              <p className="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
                Please include the relevant article URL when reporting a correction or factual concern so our editorial team can review it quickly.
              </p>
            </div>
          </aside>

          <ContactForm />
        </div>
      </main>

      <Footer />
    </>
  );
}
