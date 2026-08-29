import Link from "next/link";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Page Under Process",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-grow items-center justify-center bg-background px-4 py-16 md:px-16">
        <section className="w-full max-w-2xl rounded-2xl border border-outline-variant/30 bg-surface px-6 py-12 text-center shadow-sm md:px-12 md:py-16">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
            <i className="fa-solid fa-person-digging" aria-hidden="true" />
          </span>
          <p className="mt-6 font-label-sm text-xs font-bold uppercase tracking-[0.2em] text-secondary">Coming soon</p>
          <h1 className="mt-3 font-display-lg text-3xl text-primary md:text-4xl">This page is under process</h1>
          <p className="mx-auto mt-4 max-w-lg font-body-md leading-relaxed text-on-surface-variant">
            We are currently building this section to bring you a better experience. Please check back soon.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-label-md text-sm text-on-primary transition-colors hover:bg-primary-container">
              <i className="fa-solid fa-house text-xs" aria-hidden="true" /> Home
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-5 py-3 font-label-md text-sm text-primary transition-colors hover:bg-surface-container">
              Contact us
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-outline-variant/30 bg-surface-container-highest px-4 py-5 text-center font-body-md text-xs text-on-surface-variant">
        &copy; 2026 Indian Rajneeti Publications. All rights reserved.
      </footer>
    </>
  );
}
