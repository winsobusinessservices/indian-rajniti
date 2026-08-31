"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";
import ReasonModal from "@/components/common/ReasonModal";
import { PERMISSIONS, PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";

// Only these roles count as "the team" — plain USER accounts (public
// self-signups/readers) aren't something an admin manages here.
const TEAM_ROLES = ["ADMIN", "EDITOR", "AUTHOR", "INVESTOR"];

const ROLE_BADGE = {
  ADMIN: "bg-primary text-white",
  EDITOR: "bg-primary text-white",
  AUTHOR: "bg-primary text-white",
  INVESTOR: "bg-primary text-white",
};

const STATUS_BADGE = {
  ACTIVE: "bg-green-600 text-white",
  SUSPENDED: "bg-error text-on-error",
};

// Mirrors EMAIL_REGEX in the backend's auth.controller.js.
const EMAIL_REGEX = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

const fieldClass =
  "w-full border border-outline-variant/30 bg-surface-container-low rounded px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none font-body-md text-sm";

/**
 * `refreshKey` lets a parent (e.g. after CreateTeamMemberClient creates a
 * new account) force this table to refetch without prop-drilling the list
 * itself — bump the key and the effect below re-runs.
 */
export default function TeamMembersTable({ refreshKey = 0 }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", permissions: [] });
  const [rowError, setRowError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    // Refetching intentionally enters a loading state when the refresh key changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    authApi
      .listUsers()
      .then((data) => setMembers((data.users || []).filter((m) => TEAM_ROLES.includes(m.role))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, email: member.email, role: member.role, permissions: member.permissions || [] });
    setRowError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError("");
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "role" && value !== prev.role ? { permissions: ROLE_DEFAULT_PERMISSIONS[value] || [] } : {}),
    }));
  };

  const togglePermission = (permission) => {
    setEditForm((prev) => {
      const selected = prev.permissions.includes(permission);
      let permissions = selected
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission];
      const siteDataChildren = PERMISSION_GROUPS[2].permissions.map(([value]) => value);
      if (!selected && siteDataChildren.includes(permission) && !permissions.includes(PERMISSIONS.MANAGE_SITE_DATA)) {
        permissions.push(PERMISSIONS.MANAGE_SITE_DATA);
      }
      if (permission === PERMISSIONS.MANAGE_SITE_DATA && selected) {
        permissions = permissions.filter((item) => !siteDataChildren.includes(item));
      }
      return { ...prev, permissions };
    });
  };

  const saveEdit = async (member) => {
    setRowError("");

    const name = editForm.name.trim();
    const email = editForm.email.trim().toLowerCase();
    if (!name) {
      setRowError("Name cannot be empty");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setRowError("Please enter a valid email address");
      return;
    }

    const payload = {};
    if (name !== member.name) payload.name = name;
    if (email !== member.email) payload.email = email;
    if (editForm.role !== member.role) payload.role = editForm.role;
    if (JSON.stringify([...editForm.permissions].sort()) !== JSON.stringify([...(member.permissions || [])].sort())) {
      payload.permissions = editForm.permissions;
    }

    if (!Object.keys(payload).length) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    try {
      const data = await authApi.updateUser(member.id, payload);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? data.user : m)));
      setEditingId(null);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    await authApi.deleteUser(deleteTarget.id);
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div>
      <h2 className="font-headline-lg text-primary text-xl mb-4">Team Members</h2>

      {error && (
        <p className="text-sm text-error font-body-md mb-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <DashboardRowsSkeleton count={4} />
      ) : members.length === 0 ? (
        <p className="font-body-md text-on-surface-variant mb-8">No team members yet.</p>
      ) : (
        <div className="mb-10 max-h-[70vh] overflow-auto rounded-lg border border-outline-variant/20">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr className="text-left font-label-md text-xs uppercase tracking-wide text-on-surface-variant">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 ">
              {members.map((member) => {
                const isEditing = editingId === member.id;
                const isSelf = member.id === user?.id;

                return (
                  <Fragment key={member.id}>
                  <tr className="bg-surface-container align-top">
                    <td className="px-4 py-3 min-w-[10rem]">
                      {isEditing ? (
                        <input name="name" value={editForm.name} onChange={handleFieldChange} className={fieldClass} />
                      ) : (
                        <span className="font-body-md text-on-surface">
                          {member.name}
                          {isSelf && <span className="text-on-surface-variant"> (you)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[14rem]">
                      {isEditing ? (
                        <input
                          name="email"
                          type="email"
                          value={editForm.email}
                          onChange={handleFieldChange}
                          className={fieldClass}
                        />
                      ) : (
                        <span className="font-body-md text-on-surface-variant">{member.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[9rem]">
                      {isEditing ? (
                        <select
                          name="role"
                          value={editForm.role}
                          onChange={handleFieldChange}
                          disabled={isSelf}
                          title={isSelf ? "You cannot change your own role" : undefined}
                          className={`${fieldClass} disabled:opacity-60`}
                        >
                          {TEAM_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase ${
                            ROLE_BADGE[member.role] || "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase ${
                          STATUS_BADGE[member.status] || "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-body-md text-on-surface-variant whitespace-nowrap">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 min-w-[8rem]">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          {rowError && <p className="text-xs text-error font-body-md">{rowError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(member)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-label-md bg-primary text-on-primary rounded hover:bg-primary-container transition-colors disabled:opacity-60"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                          >
                            <i className="fa-solid fa-pen mr-1.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(member)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own account" : undefined}
                            className="px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-trash mr-1.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-surface-container-low/70">
                      <td colSpan={6} className="border-t border-outline-variant/15 px-4 py-4">
                        {editForm.role === "ADMIN" ? (
                          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                            Admin accounts always have every privilege.
                          </div>
                        ) : (
                          <div>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="font-headline-md text-sm text-primary">Edit Privileges</h3>
                                <p className="mt-1 text-xs text-on-surface-variant">Changes take effect on the member&apos;s next API request.</p>
                              </div>
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-label-md text-primary">
                                {editForm.permissions.length} selected
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {PERMISSION_GROUPS.map((group) => (
                                <fieldset key={group.label} className="min-w-0 rounded-lg border border-outline-variant/25 bg-surface p-3">
                                  <legend className="px-1 text-xs font-semibold font-label-md text-primary">{group.label}</legend>
                                  <div className="space-y-1">
                                    {group.permissions.map(([value, label]) => (
                                      <label key={value} className="flex min-h-9 cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-surface-container">
                                        <input
                                          type="checkbox"
                                          checked={editForm.permissions.includes(value)}
                                          onChange={() => togglePermission(value)}
                                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                                        />
                                        <span className="min-w-0 break-words text-xs leading-5 text-on-surface-variant">{label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReasonModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this team member?"
        description={
          deleteTarget
            ? `This permanently removes ${deleteTarget.name}'s (${deleteTarget.email}) account. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
