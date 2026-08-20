import Link from "next/link";
import CategoryPageShell from "@/components/category/CategoryPageShell";
import { careersApi } from "@/lib/api";

export const metadata = { title: "Careers" };

const EMPLOYMENT_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

function JobCard({ job }) {
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group flex flex-col gap-2 bg-surface p-5 rounded-lg border border-outline-variant/20 hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
          {EMPLOYMENT_LABEL[job.employment_type]}
        </span>
        {job.department && <span className="text-outline text-[10px]">• {job.department}</span>}
      </div>
      <h3 className="font-headline-md text-lg text-on-surface group-hover:text-primary transition-colors leading-snug">
        {job.title}
      </h3>
      <p className="font-body-md text-on-surface-variant line-clamp-2 text-sm">{job.description}</p>
      {job.location && (
        <span className="font-label-sm text-xs text-outline flex items-center gap-1.5 mt-1">
          <i className="fa-solid fa-location-dot" /> {job.location}
        </span>
      )}
    </Link>
  );
}

export default async function CareersPage() {
  const { jobs } = await careersApi.list();

  return (
    <CategoryPageShell title="Careers" count={jobs.length} gridClassName="grid grid-cols-1 md:grid-cols-2 gap-6">
      {jobs.length === 0 ? (
        <p className="font-body-md text-on-surface-variant col-span-full">
          There are no open positions right now — check back soon.
        </p>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
      )}
    </CategoryPageShell>
  );
}
