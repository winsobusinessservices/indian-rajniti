"use client";

import { useEffect, useState } from "react";
import { careersApi, mediaUrl } from "@/lib/api";
import Link from "next/link";

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
];

const STATUS_BADGE = {
  OPEN: "bg-primary/10 text-primary",
  CLOSED: "bg-surface-container-high text-on-surface-variant",
};

const APPLICATION_STATUS_BADGE = {
  PENDING: "bg-secondary/10 text-secondary",
  REVIEWED: "bg-surface-tint/10 text-surface-tint",
  ACCEPTED: "bg-green-600/10 text-green-700",
  REJECTED: "bg-error/10 text-error",
};

const APPLICATION_STATUS_OPTIONS = ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"];

const sectionClass = "bg-surface-container-low/60 rounded-lg border border-primary/30 p-5";
const initialForm = { title: "", department: "", location: "", employmentType: "FULL_TIME", description: "", requirements: "", responsibilities: "", closesAt: "" };

// Fixed-height scrollable body so a busy posting's applicant list doesn't
// push the rest of the page down — 3 rows visible before scrolling, per
// the admin's request; the status filter narrows the set instead of
// requiring scrolling through everything.
const SCROLL_BODY_CLASS = "max-h-[260px] overflow-y-auto";

function FieldLabel({ children, required }) {
  return (
    <label className="flex items-center gap-1 font-label-md text-xs text-on-surface-variant mb-1.5">
      {children}
      {required && <span className="text-error">*</span>}
    </label>
  );
}

const fieldClass =
  "w-full border border-outline-variant/30 bg-surface-container-low rounded px-3 py-2.5 text-on-surface focus:border-primary focus:outline-none font-body-md transition-colors";

export default function CareerAdminClient() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editingJobId, setEditingJobId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [applications, setApplications] = useState({});
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await careersApi.listForAdmin();
      setJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      if (editingJobId) {
        await careersApi.update(editingJobId, form);
        setSuccess("Job posting updated.");
      } else {
        await careersApi.create(form);
        setSuccess("Job posting created.");
      }
      setForm(initialForm);
      setEditingJobId(null);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (job) => {
    setError("");
    setSuccess("");
    setEditingJobId(job.id);
    setForm({
      title: job.title || "",
      department: job.department || "",
      location: job.location || "",
      employmentType: job.employment_type || "FULL_TIME",
      description: job.description || "",
      requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      closesAt: job.closes_at ? job.closes_at.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  };

  const toggleStatus = async (job) => {
    const nextStatus = job.status === "OPEN" ? "CLOSED" : "OPEN";
    await careersApi.setStatus(job.id, nextStatus);
    await loadJobs();
  };

  const handleDelete = async (job) => {
    await careersApi.remove(job.id);
    await loadJobs();
  };

  const toggleApplications = async (job) => {
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(job.id);
    if (!applications[job.id]) {
      setApplicationsLoading(true);
      try {
        const data = await careersApi.listApplications(job.id);
        setApplications((prev) => ({ ...prev, [job.id]: data.applications }));
      } catch (err) {
        setError(err.message);
      } finally {
        setApplicationsLoading(false);
      }
    }
  };

  const handleReview = async (job, application, status) => {
    await careersApi.reviewApplication(job.id, application.id, { status });
    const data = await careersApi.listApplications(job.id);
    setApplications((prev) => ({ ...prev, [job.id]: data.applications }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        <div className={sectionClass}>
          <h2 className="font-headline-md text-sm text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
            <i className="fa-solid fa-briefcase" /> Existing Postings
          </h2>
          {loading ? (
            <p className="font-body-md text-sm text-on-surface-variant">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="font-body-md text-sm text-on-surface-variant">No job postings yet — create one using the form.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="border border-outline-variant/20 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-headline-md text-base text-on-surface">{job.title}</h3>
                        <span className={`text-[10px] font-label-md uppercase px-2 py-0.5 rounded-sm ${STATUS_BADGE[job.status]}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="font-body-md text-xs text-on-surface-variant">
                        {job.department || "General"} • {job.location || "Remote"} • {EMPLOYMENT_TYPES.find((t) => t.value === job.employment_type)?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/careers/${job.slug}`}
                        target="_blank"
                        className="font-label-sm text-xs uppercase text-primary p-2 border border-primary-500 hover:bg-primary hover:text-white"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEdit(job)}
                        className="font-label-sm text-xs uppercase text-primary p-2 border border-primary-500 hover:bg-primary hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleApplications(job)}
                        className="font-label-sm text-xs uppercase inline-flex items-center gap-1.5 px-3 py-2 rounded bg-primary text-on-primary hover:bg-primary-container transition-colors"
                      >
                        <i className={`fa-solid ${expandedJobId === job.id ? "fa-chevron-up" : "fa-users"}`} />
                        {expandedJobId === job.id ? "Hide Applications" : "View Applications"}
                        {applications[job.id]?.length > 0 && (
                          <span className="bg-on-primary/20 text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                            {applications[job.id].length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(job)}
                        className={`font-label-sm text-xs uppercase bg-transparent p-2 border ${job.status=="OPEN"? "hover:bg-red-500 hover:text-white text-red-500 border-red-500":" hover:bg-green-500 hover:text-white text-green-500 border-green-500"}`}
                      >
                        {job.status === "OPEN" ? "Close" : "Reopen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(job)}
                        className="font-label-sm text-xs uppercase text-error hover:bg-red-700 hover:text-white border border-red-500 p-2"
                      > 
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedJobId === job.id && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/20">
                      {applicationsLoading && !applications[job.id] ? (
                        <p className="font-body-md text-xs text-on-surface-variant">Loading applications…</p>
                      ) : !applications[job.id]?.length ? (
                        <p className="font-body-md text-xs text-on-surface-variant">No applications yet.</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <label className="font-label-md text-xs text-on-surface-variant">Status</label>
                            <select
                              value={applicationStatusFilter}
                              onChange={(e) => setApplicationStatusFilter(e.target.value)}
                              className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/30 text-xs font-body-md text-on-surface focus:border-primary focus:outline-none"
                            >
                              <option value="">All statuses</option>
                              {APPLICATION_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>

                          {(() => {
                            const filtered = applications[job.id].filter(
                              (app) => !applicationStatusFilter || app.status === applicationStatusFilter
                            );
                            if (!filtered.length) {
                              return (
                                <p className="font-body-md text-xs text-on-surface-variant">
                                  No applications match this filter.
                                </p>
                              );
                            }
                            return (
                              <div className="rounded-lg border border-outline-variant/20 overflow-hidden">
                                <div className={`overflow-x-auto ${SCROLL_BODY_CLASS}`}>
                                  <table className="w-full text-sm border-collapse">
                                    <thead className="bg-surface-container-low sticky top-0 z-10">
                                      <tr className="text-left font-label-md text-[10px] uppercase tracking-wide text-on-surface-variant">
                                        <th className="px-3 py-2">Applicant</th>
                                        <th className="px-3 py-2">Details</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Documents</th>
                                        <th className="px-3 py-2">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/15">
                                      {filtered.map((app) => (
                                        <tr key={app.id} className="bg-surface-container align-top">
                                          <td className="px-3 py-2 min-w-[9rem]">
                                            <p className="font-label-md text-sm text-on-surface">{app.name}</p>
                                            <p className="font-body-md text-xs text-on-surface-variant">{app.email}</p>
                                          </td>
                                          <td className="px-3 py-2 min-w-[9rem] font-body-md text-xs text-on-surface-variant">
                                            {app.phone && <span className="block">{app.phone}</span>}
                                            {app.pan && <span className="block">PAN: {app.pan}</span>}
                                            {app.aadhaar && <span className="block">Aadhaar: {app.aadhaar}</span>}
                                            {app.cover_letter && (
                                              <span
                                                className="block max-w-[12rem] truncate"
                                                title={app.cover_letter}
                                              >
                                                “{app.cover_letter}”
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span
                                              className={`text-[10px] font-label-md uppercase px-2 py-0.5 rounded-sm ${APPLICATION_STATUS_BADGE[app.status]}`}
                                            >
                                              {app.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 min-w-[9rem]">
                                            <div className="flex flex-wrap gap-1.5">
                                              <a
                                                href={mediaUrl(app.resume)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-label-sm text-[10px] uppercase inline-flex items-center gap-1 px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
                                              >
                                                <i className="fa-solid fa-file-arrow-down" /> Resume
                                              </a>
                                              {app.graduation_certificate && (
                                                <a
                                                  href={mediaUrl(app.graduation_certificate)}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="font-label-sm text-[10px] uppercase inline-flex items-center gap-1 px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
                                                >
                                                  <i className="fa-solid fa-file-arrow-down" /> Certificate
                                                </a>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 min-w-[9rem]">
                                            {(app.status === "PENDING" || app.status === "REVIEWED") ? (
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleReview(job, app, "ACCEPTED")}
                                                  className="font-label-sm text-[10px] uppercase inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                >
                                                  <i className="fa-solid fa-check" /> Accept
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleReview(job, app, "REJECTED")}
                                                  className="font-label-sm text-[10px] uppercase inline-flex items-center gap-1 px-2 py-1 rounded bg-error text-white hover:bg-red-700 transition-colors"
                                                >
                                                  <i className="fa-solid fa-xmark" /> Reject
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="font-body-md text-xs text-on-surface-variant">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={sectionClass}>
        <h2 className="font-headline-md text-sm text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
          <i className={`fa-solid ${editingJobId ? "fa-pen" : "fa-plus"}`} /> {editingJobId ? "Edit Job Posting" : "New Job Posting"}
        </h2>
        <div className="space-y-4">
          <div>
            <FieldLabel required>Title</FieldLabel>
            <input type="text" name="title" required value={form.title} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <input type="text" name="department" value={form.department} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel>Location</FieldLabel>
            <input type="text" name="location" value={form.location} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel required>Employment Type</FieldLabel>
            <select name="employmentType" value={form.employmentType} onChange={handleChange} className={fieldClass}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel required>Description</FieldLabel>
            <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel>Requirements</FieldLabel>
            <textarea name="requirements" rows={3} value={form.requirements} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel>Responsibilities</FieldLabel>
            <textarea name="responsibilities" rows={3} value={form.responsibilities} onChange={handleChange} className={fieldClass} />
          </div>
          <div>
            <FieldLabel>Applications Close</FieldLabel>
            <input type="date" name="closesAt" value={form.closesAt} onChange={handleChange} className={fieldClass} />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-error font-body-md" role="alert">
              <i className="fa-solid fa-triangle-exclamation mt-0.5" /> {error}
            </p>
          )}
          {success && (
            <p className="flex items-start gap-1.5 text-sm text-primary font-body-md" role="status">
              <i className="fa-solid fa-circle-check mt-0.5" /> {success}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded font-label-md uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
            >
              <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : editingJobId ? "fa-check" : "fa-briefcase"}`} />
              {submitting ? "Saving..." : editingJobId ? "Update Job" : "Post Job"}
            </button>
            {editingJobId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-3 rounded font-label-md uppercase tracking-widest text-xs border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
