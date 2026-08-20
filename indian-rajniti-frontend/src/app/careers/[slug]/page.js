import Link from "next/link";
import { notFound } from "next/navigation";

import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ApplyToJobClient from "@/components/careers/ApplyToJobClient";

import { getBreakingNews } from "@/features/news/news.api";
import { careersApi } from "@/lib/api";

const EMPLOYMENT_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

async function getJob(slug) {
  try {
    const { job } = await careersApi.getBySlug(slug);
    return job;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    return {
      title: "Position not found",
    };
  }

  return {
    title: job.title,
    description: job.description,
  };
}

export default async function CareerDetailPage({ params }) {
  const { slug } = await params;

  const job = await getJob(slug);

  if (!job) {
    notFound();
  }

  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-8">

          {/* Main 65 / 35 Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(360px,1fr)] gap-10 xl:gap-14">

            {/* ========================================= */}
            {/* LEFT SIDE - JOB DETAILS */}
            {/* ========================================= */}

            <section className="min-w-0">

              {/* Breadcrumb */}
              <nav className="flex flex-wrap items-center gap-2 text-xs font-label-md text-on-surface-variant mb-6">
                <Link
                  href="/"
                  className="hover:text-primary transition-colors"
                >
                  Home
                </Link>

                <i className="fa-solid fa-chevron-right text-[10px]" />

                <Link
                  href="/careers"
                  className="hover:text-primary transition-colors"
                >
                  Careers
                </Link>

                <i className="fa-solid fa-chevron-right text-[10px]" />

                <span className="text-primary truncate max-w-[250px]">
                  {job.title}
                </span>
              </nav>

              {/* Employment Type */}
              <span className="inline-block px-3 py-1 bg-primary text-on-primary text-xs font-label-md uppercase tracking-widest rounded-sm mb-4">
                {EMPLOYMENT_LABEL[job.employment_type] ||
                  job.employment_type}
              </span>

              {/* Job Title */}
              <h1 className="font-display-lg text-3xl md:text-4xl lg:text-5xl text-on-surface tracking-tight leading-tight mb-5">
                {job.title}
              </h1>

              {/* Job Meta */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-on-surface-variant font-label-md mb-8 pb-6 border-b border-outline-variant/30">

                {job.department && (
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-building text-primary" />
                    {job.department}
                  </span>
                )}

                {job.location && (
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-primary" />
                    {job.location}
                  </span>
                )}

                {job.closes_at && (
                  <span className="flex items-center gap-2">
                    <i className="fa-regular fa-calendar text-primary" />
                    Apply by{" "}
                    {new Date(job.closes_at).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-8 font-body-md text-on-surface-variant leading-relaxed">

                {job.description && (
                  <div>
                    <h2 className="font-headline-lg text-primary text-xl mb-3">
                      About the Role
                    </h2>

                    <p className="whitespace-pre-line">
                      {job.description}
                    </p>
                  </div>
                )}

                {job.responsibilities && (
                  <div>
                    <h2 className="font-headline-lg text-primary text-xl mb-3">
                      Responsibilities
                    </h2>

                    <p className="whitespace-pre-line">
                      {job.responsibilities}
                    </p>
                  </div>
                )}

                {job.requirements && (
                  <div>
                    <h2 className="font-headline-lg text-primary text-xl mb-3">
                      Requirements
                    </h2>

                    <p className="whitespace-pre-line">
                      {job.requirements}
                    </p>
                  </div>
                )}

                {/* Additional Information */}
                <div className="pt-6 border-t border-outline-variant/30">

                  <h2 className="font-headline-lg text-primary text-xl mb-4">
                    Before You Apply
                  </h2>

                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <i className="fa-solid fa-circle-check text-primary mt-1" />
                      <span>
                        Make sure your personal details match your
                        government documents.
                      </span>
                    </li>

                    <li className="flex gap-3">
                      <i className="fa-solid fa-circle-check text-primary mt-1" />
                      <span>
                        Keep your PAN and Aadhaar details ready.
                      </span>
                    </li>

                    <li className="flex gap-3">
                      <i className="fa-solid fa-circle-check text-primary mt-1" />
                      <span>
                        Upload a clear graduation certificate.
                      </span>
                    </li>

                    <li className="flex gap-3">
                      <i className="fa-solid fa-circle-check text-primary mt-1" />
                      <span>
                        Upload your latest resume in PDF format.
                      </span>
                    </li>
                  </ul>

                </div>
              </div>
            </section>

            {/* ========================================= */}
            {/* RIGHT SIDE - APPLICATION FORM */}
            {/* ========================================= */}

            <aside className="lg:sticky lg:top-24 h-fit">

                <ApplyToJobClient job={job} />

            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}