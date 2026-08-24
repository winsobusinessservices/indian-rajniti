"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoriesApi } from "@/lib/api";

const ROWS_PER_PAGE = 6;

export default function CategoryAdminClient() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const normalizedFilter = filter.trim().toLowerCase();
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(normalizedFilter)
  );
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const firstRow = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleCategories = filteredCategories.slice(firstRow, firstRow + ROWS_PER_PAGE);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let active = true;
    categoriesApi.list()
      .then((data) => {
        if (active) setCategories(data.categories || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addCategory = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await categoriesApi.create(name);
      setName("");
      setSuccess("Category added. It is now available in author forms.");
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Delete the category “${category.name}”? Existing posts will keep their saved category.`)) return;
    setError("");
    setSuccess("");
    try {
      await categoriesApi.remove(category.id);
      setSuccess("Category deleted from the author dropdown.");
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={addCategory} className="bg-surface-container-low/60 rounded-lg border border-primary/30 p-5">
        <h2 className="font-headline-lg text-xl text-primary mb-4">Add Category</h2>
        <label htmlFor="category-name" className="block font-label-md text-xs text-on-surface-variant mb-1.5">
          Category name <span className="text-error">*</span>
        </label>
        <input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
          placeholder="e.g. Foreign Policy"
          className="w-full border border-outline-variant/30 bg-surface-container-low rounded px-3 py-2.5 text-on-surface focus:border-primary focus:outline-none"
        />
        {error && <p className="text-sm text-error mt-3" role="alert">{error}</p>}
        {success && <p className="text-sm text-primary mt-3" role="status">{success}</p>}
        <button disabled={submitting} className="w-full mt-4 bg-primary text-on-primary px-5 py-2.5 rounded font-label-md disabled:opacity-60">
          {submitting ? "Adding..." : "Add Category"}
        </button>
      </form>

      <section className="lg:col-span-2 bg-surface-container-low/60 rounded-lg border border-primary/30 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-headline-lg text-xl text-primary">Available Categories</h2>
            <p className="font-body-md text-xs text-on-surface-variant mt-1">
              {filteredCategories.length} of {categories.length} categories
            </p>
          </div>
          <div className="relative sm:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
            <input
              type="search"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Filter categories..."
              aria-label="Filter categories"
              className="w-full border border-outline-variant/30 bg-surface-container-low rounded pl-9 pr-9 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
            {filter && (
              <button
                type="button"
                onClick={() => {
                  setFilter("");
                  setPage(1);
                }}
                aria-label="Clear category filter"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center min-h-64 text-on-surface-variant">
            <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center min-h-64 flex flex-col items-center justify-center text-on-surface-variant">
            <i className="fa-solid fa-folder-open text-3xl text-primary/50 mb-3" />
            <p>No categories have been added.</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center min-h-64 flex flex-col items-center justify-center text-on-surface-variant">
            <i className="fa-solid fa-filter-circle-xmark text-3xl text-primary/50 mb-3" />
            <p>No categories match “{filter}”.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-outline-variant/25">
              <table className="w-full text-left border-collapse">
                <thead className="bg-primary/10 text-primary">
                  <tr>
                    <th className="px-4 py-3 font-label-md text-xs uppercase tracking-wider w-14">#</th>
                    <th className="px-4 py-3 font-label-md text-xs uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 font-label-md text-xs uppercase tracking-wider hidden sm:table-cell">Slug</th>
                    <th className="px-4 py-3 font-label-md text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 bg-surface-container-low">
                  {visibleCategories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{firstRow + index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-label-md text-sm text-on-surface">{category.name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant hidden sm:table-cell">/{category.slug}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/category/${category.slug}`}
                            title="Open category page"
                            aria-label={`Open ${category.name} page`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded border border-primary/30 text-primary hover:bg-primary hover:text-on-primary transition-colors"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeCategory(category)}
                            title="Delete category"
                            aria-label={`Delete ${category.name}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded border border-error/30 text-error hover:bg-error hover:text-white transition-colors"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
              <p className="font-body-md text-xs text-on-surface-variant">
                Showing {firstRow + 1}–{Math.min(firstRow + ROWS_PER_PAGE, filteredCategories.length)} of {filteredCategories.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded border border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <span className="font-label-md text-xs text-on-surface min-w-16 text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded border border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
